// ========================================
// Video to MP3 Converter - Renderer Script
// ========================================

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const sidebarEmpty = document.getElementById('sidebar-empty');
const fileList = document.getElementById('file-list');
const fileCount = document.getElementById('file-count');
const btnClear = document.getElementById('btn-clear');
const btnBrowse = document.getElementById('btn-browse');
const outputDirInput = document.getElementById('output-dir');
const qualitySelect = document.getElementById('quality');
const btnConvert = document.getElementById('btn-convert');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');
const successSection = document.getElementById('success-section');
const successMessage = document.getElementById('success-message');
const btnOpenFolder = document.getElementById('btn-open-folder');

// State
let files = [];
let outputDir = '';
let isConverting = false;

// ========================================
// Window Controls
// ========================================
document.getElementById('btn-minimize').addEventListener('click', () => {
  window.electronAPI.minimize();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  window.electronAPI.maximize();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.electronAPI.close();
});

// ========================================
// File Selection
// ========================================
dropZone.addEventListener('click', () => {
  if (!isConverting) {
    fileInput.click();
  }
});

dropZone.addEventListener('dragenter', (e) => {
  console.log('Drag enter');
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragover', (e) => {
  console.log('Drag over');
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  console.log('Drag leave');
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  console.log('Drop event detected');
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
  
  if (isConverting) {
    console.log('Conversion in progress, ignoring drop');
    return;
  }
  
  const files = e.dataTransfer.files;
  console.log('Dropped items:', files.length);
  
  const droppedFiles = Array.from(files).filter(file => {
    console.log('Checking file:', file.name, file.type, file.path);
    const ext = file.name.split('.').pop().toLowerCase();
    return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(ext);
  });
  
  console.log('Valid video files:', droppedFiles.length);
  
  // Get file paths using Electron API
  try {
    const filePaths = droppedFiles.map(f => {
      try {
        console.log('Getting path for:', f.name);
        const p = window.electronAPI.getFilePath(f);
        console.log('Got path:', p);
        return p;
      } catch (err) {
        console.error('Error getting path for file:', f.name, err);
        return null;
      }
    }).filter(p => p !== null);
    
    if (filePaths.length > 0) {
      console.log('Adding files:', filePaths);
      await addFiles(filePaths);
    } else {
      console.warn('No valid file paths found');
    }
  } catch (err) {
    console.error('Drop handler error:', err);
    alert('Lỗi khi đọc file: ' + err.message);
  }
});

fileInput.addEventListener('change', async () => {
  const selectedFiles = Array.from(fileInput.files);
  const filePaths = selectedFiles.map(f => window.electronAPI.getFilePath(f));
  await addFiles(filePaths);
  fileInput.value = '';
});

async function addFiles(filePaths) {
  for (const filePath of filePaths) {
    if (!files.some(f => f.path === filePath)) {
      try {
        const info = await window.electronAPI.getVideoInfo(filePath);
        files.push({
          path: filePath,
          name: info.filename,
          size: formatBytes(info.size),
          duration: formatDuration(info.duration),
          status: 'ready',
          progress: 0
        });
      } catch (err) {
        console.error('Error getting video info:', err);
      }
    }
  }
  updateFileList();
  updateConvertButton();
}

// ========================================
// File List Management
// ========================================
function updateFileList() {
  fileCount.textContent = `(${files.length})`;
  
  if (files.length > 0) {
    sidebarEmpty.style.display = 'none';
    fileList.style.display = 'block';
    successSection.classList.remove('visible');
  } else {
    sidebarEmpty.style.display = 'flex';
    fileList.style.display = 'none';
  }
  
  fileList.innerHTML = files.map((file, index) => `
    <div class="file-item" data-index="${index}">
      <div class="file-icon">🎬</div>
      <div class="file-info">
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">${file.size} • ${file.duration}</div>
      </div>
      ${file.status === 'converting' ? `
        <div class="file-progress">
          <div class="file-progress-bar">
            <div class="file-progress-fill" style="width: ${file.progress}%"></div>
          </div>
        </div>
      ` : ''}
      <span class="file-status ${file.status}">${getStatusText(file.status)}</span>
      ${file.status === 'ready' ? `
        <button class="btn-remove" data-index="${index}" title="Xóa">✕</button>
      ` : ''}
    </div>
  `).join('');
  
  // Add remove handlers
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      files.splice(index, 1);
      updateFileList();
      updateConvertButton();
    });
  });
}

function getStatusText(status) {
  const texts = {
    ready: 'Sẵn sàng',
    converting: 'Đang xử lý...',
    done: 'Hoàn thành',
    error: 'Lỗi'
  };
  return texts[status] || status;
}

btnClear.addEventListener('click', () => {
  if (!isConverting) {
    files = [];
    updateFileList();
    updateConvertButton();
  }
});

// ========================================
// Output Directory
// ========================================
btnBrowse.addEventListener('click', async () => {
  const dir = await window.electronAPI.selectOutputDir();
  if (dir) {
    outputDir = dir;
    outputDirInput.value = dir;
    updateConvertButton();
  }
});

// ========================================
// Conversion
// ========================================
function updateConvertButton() {
  btnConvert.disabled = files.length === 0 || !outputDir || isConverting;
}

btnConvert.addEventListener('click', startConversion);

async function startConversion() {
  if (files.length === 0 || !outputDir || isConverting) return;
  
  isConverting = true;
  const bitrate = qualitySelect.value;
  const totalFiles = files.length;
  let completedFiles = 0;
  let hasErrors = false;
  
  // Reset states
  files.forEach(f => {
    f.status = 'ready';
    f.progress = 0;
  });
  
  // Show progress section
  progressSection.classList.add('visible');
  successSection.classList.remove('visible');
  btnConvert.disabled = true;
  updateProgressBar(0, totalFiles);
  
  // Listen for progress updates
  window.electronAPI.onProgress((data) => {
    const file = files[data.fileIndex];
    if (file) {
      file.progress = Math.round(data.percent);
      updateFileList();
    }
  });
  
  // Convert each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    file.status = 'converting';
    updateFileList();
    
    try {
      await window.electronAPI.convertToMp3({
        inputPath: file.path,
        outputDir: outputDir,
        bitrate: bitrate,
        fileIndex: i
      });
      
      file.status = 'done';
      file.progress = 100;
      completedFiles++;
    } catch (err) {
      console.error('Conversion error:', err);
      file.status = 'error';
      hasErrors = true;
    }
    
    updateFileList();
    updateProgressBar(completedFiles, totalFiles);
  }
  
  // Done
  isConverting = false;
  progressSection.classList.remove('visible');
  
  if (completedFiles > 0) {
    successSection.classList.add('visible');
    successMessage.textContent = `Đã chuyển đổi ${completedFiles}/${totalFiles} file thành công`;
  }
  
  updateConvertButton();
}

function updateProgressBar(completed, total) {
  const percent = total > 0 ? (completed / total) * 100 : 0;
  progressBar.style.width = `${percent}%`;
  progressStatus.textContent = `${completed} / ${total}`;
}

// ========================================
// Open Output Folder
// ========================================
btnOpenFolder.addEventListener('click', () => {
  if (outputDir) {
    window.electronAPI.openOutputFolder(outputDir);
  }
});

// ========================================
// Utilities
// ========================================
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
