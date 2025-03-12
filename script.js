document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const videoSection = document.getElementById('videoSection');
    const videoPreview = document.getElementById('videoPreview');
    const enhanceBtn = document.getElementById('enhanceBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const enhanceProgress = document.getElementById('enhanceProgress');
    
    // Enhancement control elements and their values
    const controls = {
        brightness: {
            slider: document.getElementById('brightnessRange'),
            value: document.getElementById('brightnessValue')
        },
        contrast: {
            slider: document.getElementById('contrastRange'),
            value: document.getElementById('contrastValue')
        },
        saturation: {
            slider: document.getElementById('saturationRange'),
            value: document.getElementById('saturationValue')
        },
        sharpness: {
            slider: document.getElementById('sharpnessRange'),
            value: document.getElementById('sharpnessValue')
        }
    };

    const resolutionSelect = document.getElementById('resolutionSelect');
    let originalVideo = null;
    let processedVideo = null;

    // Initialize controls
    Object.keys(controls).forEach(key => {
        const control = controls[key];
        control.slider.addEventListener('input', () => {
            control.value.textContent = `${control.slider.value}%`;
            applyFilters();
        });
    });

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#27ae60';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4a90e2';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4a90e2';
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    // Click to upload functionality
    dropZone.querySelector('.upload-btn').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('video/')) {
            originalVideo = file;
            const videoUrl = URL.createObjectURL(file);
            videoPreview.src = videoUrl;
            videoSection.classList.remove('hidden');
            downloadBtn.disabled = true;
            processedVideo = null;
            resetControls();
        } else {
            showNotification('Please upload a valid video file.', 'error');
        }
    }

    function applyFilters() {
        const filters = {
            brightness: controls.brightness.slider.value,
            contrast: controls.contrast.slider.value,
            saturation: controls.saturation.slider.value,
            sharpness: controls.sharpness.slider.value
        };

        videoPreview.style.filter = `
            brightness(${filters.brightness}%)
            contrast(${filters.contrast}%)
            saturate(${filters.saturation}%)
            ${filters.sharpness > 100 ? `blur(${(filters.sharpness - 100) / 400}px)` : ''}`
        ;
    }

    // Reset functionality
    function resetControls() {
        Object.keys(controls).forEach(key => {
            controls[key].slider.value = 100;
            controls[key].value.textContent = '100%';
        });
        resolutionSelect.value = "1080";
        applyFilters();
    }

    resetBtn.addEventListener('click', resetControls);

    // Enhancement process
    enhanceBtn.addEventListener('click', async () => {
        if (!originalVideo) {
            showNotification('Please upload a video first.', 'error');
            return;
        }

        loadingOverlay.classList.remove('hidden');
        enhanceProgress.style.width = '0%';

        try {
            // Create a canvas to render the filtered video
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoPreview.videoWidth;
            canvas.height = videoPreview.videoHeight;

            // Apply filters to the video preview
            applyFilters();

            // Use MediaRecorder with canvas capture
            const stream = canvas.captureStream(30); // 30 fps
            const audioStream = videoPreview.captureStream().getAudioTracks();
            if (audioStream.length > 0) {
                stream.addTrack(audioStream[0]); // Add audio if present
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 2500000 // Increase quality
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = () => {
                processedVideo = new Blob(chunks, { type: 'video/webm' });
                videoPreview.src = URL.createObjectURL(processedVideo);
                downloadBtn.disabled = false;
                loadingOverlay.classList.add('hidden');
                enhanceProgress.style.width = '100%';
                showNotification('Video enhancement complete!', 'success');
            };

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                throw new Error('Recording failed');
            };

            // Start recording
            mediaRecorder.start();

            // Draw video to canvas with filters
            videoPreview.currentTime = 0;
            videoPreview.play();

            function renderFrame() {
                if (videoPreview.paused || videoPreview.ended) {
                    mediaRecorder.stop();
                    return;
                }
                ctx.filter = videoPreview.style.filter;
                ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(renderFrame);
            }

            requestAnimationFrame(renderFrame);

            // Update progress
            videoPreview.ontimeupdate = () => {
                const progress = (videoPreview.currentTime / videoPreview.duration) * 100;
                enhanceProgress.style.width = `${progress}%`;
            };

        } catch (error) {
            console.error('Enhancement error:', error);
            showNotification('Error enhancing video. Please try again.', 'error');
            loadingOverlay.classList.add('hidden');
        }
    });

    // Download enhanced video
    downloadBtn.addEventListener('click', () => {
        if (!processedVideo) {
            showNotification('Please enhance the video first.', 'error');
            return;
        }

        const link = document.createElement('a');
        const url = URL.createObjectURL(processedVideo);
        link.href = url;
        link.download = `enhanced-video-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
    });

    // Notification system (unchanged)
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
        }
        .notification.success { background-color: var(--success-color); }
        .notification.error { background-color: var(--error-color); }
        .notification.info { background-color: var(--primary-color); }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
});