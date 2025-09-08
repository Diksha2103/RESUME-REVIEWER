// // --- Generic File Handling Function ---
// function handleFiles(file, fileNameDisplay) {
//   const allowedTypes = [
//     "application/pdf",
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//   ];
//   const maxSize = 2 * 1024 * 1024; // 2MB

//   if (!allowedTypes.includes(file.type)) {
//     fileNameDisplay.textContent = "Invalid file type. Please use PDF or DOCX.";
//     fileNameDisplay.classList.add("text-red-500");
//     return;
//   }

//   if (file.size > maxSize) {
//     fileNameDisplay.textContent = "File is too large. Max size is 2MB.";
//     fileNameDisplay.classList.add("text-red-500");
//     return;
//   }

//   fileNameDisplay.textContent = `Selected: ${file.name}`;
//   fileNameDisplay.classList.remove("text-red-500", "text-gray-400");
//   fileNameDisplay.classList.add("text-green-500");
//   console.log("File ready for upload:", file);
// }

// // --- Setup function for each upload area ---
// function setupUploadArea(areaId, btnId, inputId, nameId) {
//   const uploadArea = document.getElementById(areaId);
//   const uploadBtn = document.getElementById(btnId);
//   const fileInput = document.getElementById(inputId);
//   const fileNameDisplay = document.getElementById(nameId);

//   if (!uploadArea || !uploadBtn || !fileInput || !fileNameDisplay) return;

//   const processFiles = (files) => {
//     if (files.length > 0) {
//       handleFiles(files[0], fileNameDisplay);
//     }
//   };

//   uploadBtn.addEventListener("click", (e) => {
//     e.stopPropagation();
//     fileInput.click();
//   });

//   uploadArea.addEventListener("click", () => {
//     fileInput.click();
//   });

//   fileInput.addEventListener("change", () => {
//     processFiles(fileInput.files);
//   });

//   ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
//     uploadArea.addEventListener(
//       eventName,
//       (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//       },
//       false
//     );
//   });

//   ["dragenter", "dragover"].forEach((eventName) => {
//     uploadArea.addEventListener(
//       eventName,
//       () => uploadArea.classList.add("drag-over"),
//       false
//     );
//   });

//   ["dragleave", "drop"].forEach((eventName) => {
//     uploadArea.addEventListener(
//       eventName,
//       () => uploadArea.classList.remove("drag-over"),
//       false
//     );
//   });

//   uploadArea.addEventListener(
//     "drop",
//     (e) => {
//       processFiles(e.dataTransfer.files);
//     },
//     false
//   );
// }

// // --- Initialize both upload areas ---
// // Note: The original HTML only had one upload area. We adapt the script to handle both.
// setupUploadArea("upload-area-1", "upload-btn-1", "file-input-1", "file-name-1");
// setupUploadArea("upload-area-2", "upload-btn-2", "file-input-2", "file-name-2");


//here real 
// script.js - Frontend Integration with FastAPI Backend

// Backend API Configuration
const API_BASE_URL = 'http:// 0.0.0.0:8000'; // Change this to your backend URL

// File upload handlers for both upload areas
const uploadAreas = [
  {
    uploadArea: document.getElementById('upload-area-1'),
    uploadBtn: document.getElementById('upload-btn-1'),
    fileInput: document.getElementById('file-input-1'),
    fileNameDisplay: document.getElementById('file-name-1')
  },
  {
    uploadArea: document.getElementById('upload-area-2'),
    uploadBtn: document.getElementById('upload-btn-2'),
    fileInput: document.getElementById('file-input-2'),
    fileNameDisplay: document.getElementById('file-name-2')
  }
];

// Initialize upload handlers
uploadAreas.forEach((elements, index) => {
  if (elements.uploadBtn && elements.fileInput) {
    // Button click triggers file input
    elements.uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.fileInput.click();
    });

    // Upload area click triggers file input
    elements.uploadArea.addEventListener('click', () => {
      elements.fileInput.click();
    });

    // Handle file selection
    elements.fileInput.addEventListener('change', (e) => {
      handleFileSelection(e.target.files[0], elements);
    });

    // Drag and drop functionality
    elements.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.uploadArea.classList.add('border-teal-500', 'bg-teal-50');
    });

    elements.uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      elements.uploadArea.classList.remove('border-teal-500', 'bg-teal-50');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.uploadArea.classList.remove('border-teal-500', 'bg-teal-50');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0], elements);
      }
    });
  }
});

// Handle file selection and validation
function handleFileSelection(file, elements) {
  if (!file) return;

  // Validate file type
  const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!validTypes.includes(file.type)) {
    showNotification('Please upload a PDF or DOCX file only.', 'error');
    return;
  }

  // Validate file size (2MB max)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    showNotification('File size must be less than 2MB.', 'error');
    return;
  }

  // Display file name
  elements.fileNameDisplay.textContent = Selected: ${file.name};
  
  // Change button text
  elements.uploadBtn.textContent = 'Analyzing...';
  elements.uploadBtn.disabled = true;

  // Upload and analyze the resume
  analyzeResume(file, elements);
}

// Analyze resume using the backend API
async function analyzeResume(file, elements) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(${API_BASE_URL}/api/resume/analyze, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(HTTP error! status: ${response.status});
    }

    const analysisResult = await response.json();
    
    // Display results
    displayAnalysisResults(analysisResult);
    
    // Reset button
    elements.uploadBtn.textContent = 'Upload Another Resume';
    elements.uploadBtn.disabled = false;
    
    showNotification('Resume analyzed successfully!', 'success');
    
  } catch (error) {
    console.error('Error analyzing resume:', error);
    showNotification('Failed to analyze resume. Please try again.', 'error');
    
    // Reset button
    elements.uploadBtn.textContent = 'Upload Your Resume';
    elements.uploadBtn.disabled = false;
  }
}

// Display analysis results in a modal
function displayAnalysisResults(results) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('results-modal');
  if (!modal) {
    modal = createResultsModal();
    document.body.appendChild(modal);
  }

  // Populate modal with results
  const modalContent = document.getElementById('modal-results-content');
  modalContent.innerHTML = `
    <div class="space-y-6">
      <!-- ATS Score -->
      <div class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-3">ATS Compatibility Score</h3>
        <div class="relative pt-1">
          <div class="flex mb-2 items-center justify-between">
            <div>
              <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                results.atsScore >= 80 ? 'text-green-600 bg-green-200' :
                results.atsScore >= 60 ? 'text-yellow-600 bg-yellow-200' :
                'text-red-600 bg-red-200'
              }">
                ${results.atsScore >= 80 ? 'Excellent' :
                  results.atsScore >= 60 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-gray-900">${results.atsScore}%</span>
            </div>
          </div>
          <div class="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-200">
            <div style="width:${results.atsScore}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
              results.atsScore >= 80 ? 'bg-green-500' :
              results.atsScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }"></div>
          </div>
        </div>
      </div>

      <!-- Grammar Issues -->
      ${results.grammar && results.grammar.length > 0 ? `
        <div class="bg-red-50 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-3 text-red-800">Grammar & Formatting Issues</h3>
          <ul class="space-y-2">
            ${results.grammar.map(issue => `
              <li class="flex items-start">
                <svg class="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm text-gray-700">${issue}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Keywords/Buzzwords -->
      <div class="bg-blue-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-3 text-blue-800">Detected Keywords & Skills</h3>
        <div class="flex flex-wrap gap-2">
          ${results.buzzwords.map(word => `
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              ${word}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Suggestions -->
      <div class="bg-green-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-3 text-green-800">Improvement Suggestions</h3>
        <ul class="space-y-3">
          ${results.suggestions.map((suggestion, index) => `
            <li class="flex items-start">
              <span class="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold mr-3">
                ${index + 1}
              </span>
              <span class="text-sm text-gray-700">${suggestion}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Matched Job Roles -->
      ${results.matchedRoles && results.matchedRoles.length > 0 ? `
        <div class="bg-purple-50 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-3 text-purple-800">Recommended Job Roles</h3>
          <div class="grid gap-4">
            ${results.matchedRoles.map(role => `
              <div class="bg-white rounded-lg p-4 border border-purple-200">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-semibold text-gray-900">${role.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">Salary: ${role.salary}</p>
                  </div>
                  <a href="${role.applyUrl}" target="_blank" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                    Apply Now
                    <svg class="ml-2 -mr-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Skills Coverage Chart -->
      ${results.charts && results.charts.skillsCoverage ? `
        <div class="bg-gray-50 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Skills Coverage Analysis</h3>
          <div class="space-y-3">
            ${Object.entries(results.charts.skillsCoverage).map(([category, percentage]) => `
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm font-medium text-gray-700">${category}</span>
                  <span class="text-sm text-gray-600">${percentage}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-teal-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Show modal
  modal.classList.remove('hidden');
}

// Create results modal
function createResultsModal() {
  const modal = document.createElement('div');
  modal.id = 'results-modal';
  modal.className = 'hidden fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick="closeModal()"></div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Resume Analysis Results</h2>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div id="modal-results-content" class="max-h-96 overflow-y-auto">
            <!-- Results will be inserted here -->
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button type="button" onclick="downloadReport()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm">
            Download Report
          </button>
          <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

// Close modal function
function closeModal() {
  const modal = document.getElementById('results-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Download report function (creates a simple text report)
function downloadReport() {
  // Get the content from modal
  const content = document.getElementById('modal-results-content');
  if (!content) return;

  // Extract text content for download
  const reportText = content.innerText;
  
  // Create blob and download
  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume_analysis_report.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showNotification('Report downloaded successfully!', 'success');
}

// Show notification function
function showNotification(message, type = 'info') {
  // Remove existing notification if any
  const existingNotification = document.getElementById('notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-transform duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
        ${type === 'success' ? 
          '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>' :
          type === 'error' ?
          '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' :
          '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>'
        }
      </svg>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Health check on page load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch(${API_BASE_URL}/health);
    if (response.ok) {
      console.log('✅ Backend API is connected and healthy');
    } else {
      console.warn('⚠ Backend API returned an error. Please check your server.');
    }
  } catch (error) {
    console.error('❌ Cannot connect to backend API. Make sure the server is running on', API_BASE_URL);
    showNotification('Backend server is not running. Please start the server first.', 'error');
  }
});

// Add styles for hover effects
const style = document.createElement('style');
style.textContent = `
  .upload-box:hover {
    border-color: #14b8a6;
    background-color: rgba(20, 184, 166, 0.05);
  }
  
  .upload-box-dark:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .privacy-lock {
    width: 16px;
    height: 16px;
  }
  
  #notification {
    transform: translateX(400px);
  }
`;
document.head.appendChild(style);