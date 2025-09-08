# main.py
import os
import io
import json
import tempfile
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from collections import Counter

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Document processing
import PyPDF2
from docx import Document
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords

# LangChain and LLM
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Initialize FastAPI app
app = FastAPI(
    title="AI Resume Reviewer API",
    description="AI-powered resume analysis and job matching service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response Models
class JobMatch(BaseModel):
    title: str
    salary: str
    applyUrl: str

class ChartData(BaseModel):
    skillsCoverage: Dict[str, Any]
    keywordDensity: Dict[str, Any]

class ResumeAnalysis(BaseModel):
    atsScore: int = Field(..., ge=0, le=100)
    grammar: List[str]
    buzzwords: List[str]
    suggestions: List[str]
    matchedRoles: List[JobMatch]
    charts: ChartData

class JobRoleAnalysisRequest(BaseModel):
    jobDescription: str

# Initialize LLM (using Claude or OpenAI based on env)
def get_llm():
    llm_provider = os.getenv("LLM_PROVIDER", "anthropic").lower()
    
    if llm_provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        return ChatAnthropic(
            model="claude-3-sonnet-20240229",
            anthropic_api_key=api_key,
            temperature=0.3
        )
    else:  # OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        return ChatOpenAI(
            model="gpt-4",
            openai_api_key=api_key,
            temperature=0.3
        )

# Text extraction functions
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file bytes"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file bytes"""
    try:
        doc = Document(io.BytesIO(file_bytes))
        text = []
        for paragraph in doc.paragraphs:
            text.append(paragraph.text)
        return '\n'.join(text).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX: {str(e)}")

def extract_text_from_file(file: UploadFile) -> str:
    """Extract text based on file type"""
    file_bytes = file.file.read()
    filename = file.filename.lower()
    
    if filename.endswith('.pdf'):
        return extract_text_from_pdf(file_bytes)
    elif filename.endswith('.docx'):
        return extract_text_from_docx(file_bytes)
    elif filename.endswith('.txt'):
        return file_bytes.decode('utf-8')
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT file.")

# Analysis functions
def calculate_ats_score(text: str, job_description: Optional[str] = None) -> int:
    """Calculate ATS compatibility score"""
    score = 0
    
    # Check for essential sections
    sections = ['experience', 'education', 'skills', 'summary', 'objective']
    text_lower = text.lower()
    for section in sections:
        if section in text_lower:
            score += 10
    
    # Check for quantifiable achievements (numbers)
    if re.findall(r'\d+%|\$\d+|\d+\+', text):
        score += 15
    
    # Check for action verbs
    action_verbs = ['achieved', 'improved', 'managed', 'developed', 'created', 'led', 'increased', 'decreased']
    for verb in action_verbs:
        if verb in text_lower:
            score += 2
    
    # Job description matching
    if job_description:
        job_words = set(word_tokenize(job_description.lower()))
        resume_words = set(word_tokenize(text_lower))
        match_ratio = len(job_words.intersection(resume_words)) / len(job_words) if job_words else 0
        score += int(match_ratio * 30)
    
    return min(score, 100)

def detect_grammar_issues(text: str) -> List[str]:
    """Detect common grammar and formatting issues"""
    issues = []
    
    # Check for inconsistent tense
    past_tense = len(re.findall(r'\b\w+ed\b', text))
    present_tense = len(re.findall(r'\b\w+ing\b', text))
    if past_tense > 0 and present_tense > 0:
        ratio = past_tense / (past_tense + present_tense)
        if 0.3 < ratio < 0.7:
            issues.append("Inconsistent verb tenses detected")
    
    # Check for passive voice
    if re.search(r'\b(was|were|been|being)\s+\w+ed\b', text, re.IGNORECASE):
        issues.append("Passive voice detected - consider using active voice")
    
    # Check for long sentences
    sentences = sent_tokenize(text)
    long_sentences = [s for s in sentences if len(s.split()) > 30]
    if long_sentences:
        issues.append(f"Found {len(long_sentences)} sentences with 30+ words - consider breaking them down")
    
    # Check for repeated words
    words = word_tokenize(text.lower())
    word_freq = Counter(words)
    repeated = [w for w, c in word_freq.items() if c > 5 and len(w) > 4 and w not in stopwords.words('english')]
    if repeated:
        issues.append(f"Overused words detected: {', '.join(repeated[:3])}")
    
    return issues

def extract_buzzwords(text: str, job_description: Optional[str] = None) -> List[str]:
    """Extract relevant industry buzzwords and keywords"""
    # Common tech/business buzzwords
    buzzword_patterns = [
        r'machine learning', r'artificial intelligence', r'deep learning',
        r'data science', r'cloud computing', r'agile', r'scrum',
        r'devops', r'ci/cd', r'microservices', r'api', r'rest',
        r'sql', r'python', r'javascript', r'react', r'node\.js',
        r'docker', r'kubernetes', r'aws', r'azure', r'gcp',
        r'analytics', r'visualization', r'dashboard', r'kpi',
        r'stakeholder', r'cross-functional', r'leadership',
        r'problem-solving', r'communication', r'teamwork'
    ]
    
    found_buzzwords = []
    text_lower = text.lower()
    
    for pattern in buzzword_patterns:
        if re.search(pattern, text_lower):
            found_buzzwords.append(pattern.replace(r'\\', '').replace('.', ''))
    
    # Add job-specific keywords if job description provided
    if job_description:
        job_words = word_tokenize(job_description.lower())
        tech_words = [w for w in job_words if len(w) > 3 and w not in stopwords.words('english')]
        word_freq = Counter(tech_words)
        top_job_words = [w for w, _ in word_freq.most_common(5)]
        for word in top_job_words:
            if word in text_lower and word not in found_buzzwords:
                found_buzzwords.append(word)
    
    return found_buzzwords[:15]  # Return top 15 buzzwords

def generate_suggestions_with_llm(text: str, job_description: Optional[str] = None) -> List[str]:
    """Generate improvement suggestions using LLM"""
    try:
        llm = get_llm()
        
        prompt = f"""
        Analyze this resume and provide 5 specific, actionable suggestions for improvement.
        
        Resume:
        {text[:2000]}  # Limit text to avoid token limits
        
        {"Job Description: " + job_description[:500] if job_description else ""}
        
        Provide suggestions in the following format:
        1. [Suggestion 1]
        2. [Suggestion 2]
        3. [Suggestion 3]
        4. [Suggestion 4]
        5. [Suggestion 5]
        
        Focus on: ATS optimization, quantifiable achievements, relevant keywords, formatting, and overall impact.
        """
        
        response = llm.invoke(prompt)
        suggestions_text = response.content if hasattr(response, 'content') else str(response)
        
        # Parse suggestions from response
        suggestions = []
        for line in suggestions_text.split('\n'):
            if re.match(r'^\d+\.', line.strip()):
                suggestion = re.sub(r'^\d+\.\s*', '', line.strip())
                if suggestion:
                    suggestions.append(suggestion)
        
        return suggestions[:5] if suggestions else [
            "Add more quantifiable achievements with specific metrics",
            "Include relevant industry keywords and technical skills",
            "Use strong action verbs at the beginning of bullet points",
            "Ensure consistent formatting and verb tenses throughout",
            "Add a professional summary highlighting key qualifications"
        ]
    except Exception as e:
        # Fallback suggestions if LLM fails
        return [
            "Add more quantifiable achievements with specific metrics",
            "Include relevant industry keywords and technical skills",
            "Use strong action verbs at the beginning of bullet points",
            "Ensure consistent formatting and verb tenses throughout",
            "Add a professional summary highlighting key qualifications"
        ]

def match_job_roles(text: str, buzzwords: List[str]) -> List[JobMatch]:
    """Match resume with potential job roles"""
    # This is a simplified matching - in production, you'd query a real job database
    job_database = [
        {"title": "Data Analyst", "keywords": ["data", "analytics", "sql", "python"], "salary": "7-9 LPA", "url": "https://example.com/job1"},
        {"title": "Software Engineer", "keywords": ["programming", "javascript", "react", "api"], "salary": "10-15 LPA", "url": "https://example.com/job2"},
        {"title": "Data Scientist", "keywords": ["machine learning", "python", "statistics"], "salary": "12-18 LPA", "url": "https://example.com/job3"},
        {"title": "DevOps Engineer", "keywords": ["docker", "kubernetes", "ci/cd", "aws"], "salary": "15-20 LPA", "url": "https://example.com/job4"},
        {"title": "Product Manager", "keywords": ["stakeholder", "agile", "analytics", "leadership"], "salary": "18-25 LPA", "url": "https://example.com/job5"},
    ]
    
    matched_roles = []
    text_lower = text.lower()
    
    for job in job_database:
        match_score = sum(1 for keyword in job["keywords"] if keyword in text_lower or keyword in buzzwords)
        if match_score >= 2:  # At least 2 keyword matches
            matched_roles.append(JobMatch(
                title=job["title"],
                salary=job["salary"],
                applyUrl=job["url"]
            ))
    
    return matched_roles[:3]  # Return top 3 matches

def generate_chart_data(text: str, buzzwords: List[str]) -> ChartData:
    """Generate data for visualization charts"""
    # Skills coverage chart
    skill_categories = {
        "Technical": ["python", "java", "javascript", "sql", "react", "node", "docker"],
        "Analytical": ["data", "analytics", "statistics", "visualization", "insights"],
        "Management": ["leadership", "team", "project", "stakeholder", "strategy"],
        "Soft Skills": ["communication", "collaboration", "problem-solving", "creative"]
    }
    
    text_lower = text.lower()
    skills_coverage = {}
    
    for category, keywords in skill_categories.items():
        coverage = sum(1 for keyword in keywords if keyword in text_lower)
        skills_coverage[category] = min(coverage * 20, 100)  # Convert to percentage
    
    # Keyword density chart
    words = word_tokenize(text_lower)
    filtered_words = [w for w in words if len(w) > 4 and w not in stopwords.words('english')]
    word_freq = Counter(filtered_words)
    top_keywords = dict(word_freq.most_common(10))
    
    return ChartData(
        skillsCoverage=skills_coverage,
        keywordDensity=top_keywords
    )

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "AI Resume Reviewer API"
    }

@app.post("/api/resume/analyze", response_model=ResumeAnalysis)
async def analyze_resume(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None)
):
    """Analyze resume from file upload or raw text"""
    # Extract text
    if file:
        resume_text = extract_text_from_file(file)
    elif text:
        resume_text = text
    else:
        raise HTTPException(status_code=400, detail="Please provide either a file or text input")
    
    # Perform analysis
    ats_score = calculate_ats_score(resume_text)
    grammar_issues = detect_grammar_issues(resume_text)
    buzzwords = extract_buzzwords(resume_text)
    suggestions = generate_suggestions_with_llm(resume_text)
    matched_roles = match_job_roles(resume_text, buzzwords)
    chart_data = generate_chart_data(resume_text, buzzwords)
    
    return ResumeAnalysis(
        atsScore=ats_score,
        grammar=grammar_issues,
        buzzwords=buzzwords,
        suggestions=suggestions,
        matchedRoles=matched_roles,
        charts=chart_data
    )

@app.post("/api/resume/analyze/jobrole", response_model=ResumeAnalysis)
async def analyze_resume_with_job_role(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    jobDescription: str = Form(...)
):
    """Analyze resume with specific job role context"""
    # Extract text
    if file:
        resume_text = extract_text_from_file(file)
    elif text:
        resume_text = text
    else:
        raise HTTPException(status_code=400, detail="Please provide either a file or text input")
    
    # Perform analysis with job description context
    ats_score = calculate_ats_score(resume_text, jobDescription)
    grammar_issues = detect_grammar_issues(resume_text)
    buzzwords = extract_buzzwords(resume_text, jobDescription)
    suggestions = generate_suggestions_with_llm(resume_text, jobDescription)
    matched_roles = match_job_roles(resume_text, buzzwords)
    chart_data = generate_chart_data(resume_text, buzzwords)
    
    return ResumeAnalysis(
        atsScore=ats_score,
        grammar=grammar_issues,
        buzzwords=buzzwords,
        suggestions=suggestions,
        matchedRoles=matched_roles,
        charts=chart_data
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "_main_":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)