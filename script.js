// --- Generic File Handling Function ---
function handleFiles(file, fileNameDisplay) {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(file.type)) {
    fileNameDisplay.textContent = "Invalid file type. Please use PDF or DOCX.";
    fileNameDisplay.classList.add("text-red-500");
    return;
  }

  if (file.size > maxSize) {
    fileNameDisplay.textContent = "File is too large. Max size is 2MB.";
    fileNameDisplay.classList.add("text-red-500");
    return;
  }

  fileNameDisplay.textContent = `Selected: ${file.name}`;
  fileNameDisplay.classList.remove("text-red-500", "text-gray-400");
  fileNameDisplay.classList.add("text-green-500");
  console.log("File ready for upload:", file);
}

// --- Setup function for each upload area ---
function setupUploadArea(areaId, btnId, inputId, nameId) {
  const uploadArea = document.getElementById(areaId);
  const uploadBtn = document.getElementById(btnId);
  const fileInput = document.getElementById(inputId);
  const fileNameDisplay = document.getElementById(nameId);

  if (!uploadArea || !uploadBtn || !fileInput || !fileNameDisplay) return;

  const processFiles = (files) => {
    if (files.length > 0) {
      handleFiles(files[0], fileNameDisplay);
    }
  };

  uploadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    processFiles(fileInput.files);
  });

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    uploadArea.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      false
    );
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    uploadArea.addEventListener(
      eventName,
      () => uploadArea.classList.add("drag-over"),
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadArea.addEventListener(
      eventName,
      () => uploadArea.classList.remove("drag-over"),
      false
    );
  });

  uploadArea.addEventListener(
    "drop",
    (e) => {
      processFiles(e.dataTransfer.files);
    },
    false
  );
}

// --- Initialize both upload areas ---
// Note: The original HTML only had one upload area. We adapt the script to handle both.
setupUploadArea("upload-area-1", "upload-btn-1", "file-input-1", "file-name-1");
setupUploadArea("upload-area-2", "upload-btn-2", "file-input-2", "file-name-2");
