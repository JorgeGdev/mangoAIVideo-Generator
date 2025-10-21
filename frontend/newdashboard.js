// ============================================================================
// NEW DASHBOARD FUNCTIONALITY
// Funcionalidades adicionales para el dashboard
// ============================================================================

console.log('📱 NewDashboard script loaded');

// ============================================================================
// FILE UPLOAD FUNCTIONALITY
// ============================================================================

// Setup photo upload functionality
function setupPhotoUpload() {
  const photoUpload = document.getElementById('photoUpload');
  const uploadZone = document.getElementById('uploadZone');
  const previewImage = document.getElementById('previewImage');
  const uploadText = document.getElementById('uploadText');

  if (!photoUpload || !uploadZone || !previewImage || !uploadText) {
    console.log('⚠️ Upload elements not found');
    return;
  }

  console.log('✅ Setting up photo upload functionality');

  // File input change handler
  photoUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      console.log(`📁 File selected from input: ${file.name}`);
      handleFileSelect(file);
    }
  });

  // Drag & Drop handlers
  uploadZone.addEventListener('dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragenter', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', function(event) {
    event.preventDefault();
    event.stopPropagation();
    // Solo quitar la clase si realmente salimos del elemento
    if (!uploadZone.contains(event.relatedTarget)) {
      uploadZone.classList.remove('dragover');
    }
  });

  uploadZone.addEventListener('drop', function(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // Click handler for upload zone - SIMPLE AND WORKING
  uploadZone.addEventListener('click', function(event) {
    // Don't trigger if clicking on preview image
    if (event.target === previewImage) {
      return;
    }
    
    console.log('🖱️ Upload zone clicked, opening file dialog');
    photoUpload.click();
  });

  function handleFileSelect(file) {
    if (!file) {
      resetUploadZone();
      return;
    }

    // Evitar procesar el mismo archivo múltiples veces
    if (uploadZone.classList.contains('has-file') && uploadText.textContent === file.name) {
      console.log(`⚠️ File ${file.name} already processed, skipping`);
      return;
    }

    console.log(`📁 File selected: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, sube solo archivos de imagen (PNG, JPG, GIF, WebP)');
      resetUploadZone();
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('El tamaño de la imagen debe ser menor a 5MB');
      resetUploadZone();
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
      uploadText.textContent = file.name;
      uploadZone.classList.add('has-file');
      
      // Hide upload icon and hint when file is selected
      const uploadIcon = uploadZone.querySelector('.upload-icon');
      const uploadHint = uploadZone.querySelector('.upload-hint');
      if (uploadIcon) uploadIcon.style.display = 'none';
      if (uploadHint) uploadHint.style.display = 'none';
      
      console.log(`✅ Image uploaded successfully: ${file.name}`);
    };
    reader.readAsDataURL(file);

    // Update the actual input ONLY if needed
    if (!photoUpload.files || photoUpload.files.length === 0 || photoUpload.files[0].name !== file.name) {
      const dt = new DataTransfer();
      dt.items.add(file);
      photoUpload.files = dt.files;
      console.log(`🔄 Updated photoUpload.files with: ${file.name}`);
    }
  }

  function resetUploadZone() {
    previewImage.style.display = 'none';
    previewImage.src = '';
    uploadText.textContent = 'Click to upload or drag & drop';
    uploadZone.classList.remove('has-file');
    photoUpload.value = '';
    
    // Show upload icon and hint again
    const uploadIcon = uploadZone.querySelector('.upload-icon');
    const uploadHint = uploadZone.querySelector('.upload-hint');
    if (uploadIcon) uploadIcon.style.display = 'block';
    if (uploadHint) uploadHint.style.display = 'block';
    
    console.log('🗑️ Upload zone reset');
  }

  // Expose reset function globally for form reset
  window.resetPhotoUpload = resetUploadZone;

  console.log('🎯 Photo upload functionality initialized');
}

// ============================================================================
// ENHANCED FORM VALIDATION
// ============================================================================

function setupFormValidation() {
  const generateBtn = document.getElementById('generateBtn');
  const photoUpload = document.getElementById('photoUpload');
  const consultaInput = document.getElementById('consultaInput');
  const voiceSelect = document.getElementById('voiceSelect');

  if (!generateBtn || !photoUpload || !consultaInput || !voiceSelect) {
    console.log('⚠️ Form elements not found for validation');
    return;
  }

  // Real-time validation
  function validateForm() {
    const hasPhoto = photoUpload.files && photoUpload.files.length > 0;
    const hasQuery = consultaInput.value.trim().length > 0;
    const hasVoice = voiceSelect.value !== '';

    // Update button state
    const isValid = hasPhoto && hasQuery && hasVoice;
    generateBtn.disabled = !isValid;
    
    if (isValid) {
      generateBtn.classList.remove('disabled');
    } else {
      generateBtn.classList.add('disabled');
    }

    return isValid;
  }

  // Add event listeners for real-time validation
  photoUpload.addEventListener('change', validateForm);
  consultaInput.addEventListener('input', validateForm);
  voiceSelect.addEventListener('change', validateForm);

  // Initial validation
  validateForm();

  console.log('✅ Form validation setup complete');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 NewDashboard initializing...');
  
  // Setup upload functionality
  setTimeout(() => {
    setupPhotoUpload();
  }, 100);
  
  // Setup form validation
  setTimeout(() => {
    setupFormValidation();
  }, 200);
  
  console.log('✅ NewDashboard initialized');
});

console.log('✅ NewDashboard script ready');