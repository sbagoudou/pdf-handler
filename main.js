import { PDFDocument, rgb } from 'pdf-lib';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Utility function to read file as ArrayBuffer
async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Utility function to render PDF preview thumbnail
async function renderPDFPreview(file, containerElement) {
    try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        const page = await pdf.getPage(1);

        // Calculate scale to fit within thumbnail width (200px max)
        const viewport = page.getViewport({ scale: 1 });
        const thumbnailWidth = 200;
        const scale = thumbnailWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-thumbnail';
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        containerElement.innerHTML = `
            <div class="thumbnail-label">Preview - Page 1 of ${numPages}</div>
            <div class="thumbnail-wrapper"></div>
        `;
        containerElement.querySelector('.thumbnail-wrapper').appendChild(canvas);
        containerElement.classList.remove('hidden');
    } catch (error) {
        console.error('Error rendering PDF preview:', error);
        containerElement.innerHTML = `<div class="status error">Could not generate preview</div>`;
        containerElement.classList.remove('hidden');
    }
}

// Utility function to download PDF
function downloadPDF(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Parse page range string (e.g., "1,3,5" or "1-5" or "1,3-5,7")
function parsePageRange(rangeStr, totalPages) {
    const pages = new Set();
    const parts = rangeStr.split(',').map(s => s.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (isNaN(start) || isNaN(end)) continue;
            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                pages.add(i - 1); // Convert to 0-based index
            }
        } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages.add(pageNum - 1); // Convert to 0-based index
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

// ============ SPLIT PDF ============
const splitInput = document.getElementById('splitInput');
const splitPreview = document.getElementById('splitPreview');
const splitOptions = document.getElementById('splitOptions');
const splitBtn = document.getElementById('splitBtn');
const splitStatus = document.getElementById('splitStatus');
const pageRangeInput = document.getElementById('pageRange');

let splitPdfDoc = null;

splitInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        splitStatus.textContent = 'Loading PDF...';
        splitStatus.className = 'status info';

        // Render preview
        await renderPDFPreview(file, splitPreview);

        const arrayBuffer = await readFileAsArrayBuffer(file);
        splitPdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = splitPdfDoc.getPageCount();

        splitOptions.classList.remove('hidden');
        splitStatus.textContent = `PDF loaded successfully. Total pages: ${pageCount}`;
        splitStatus.className = 'status success';
        pageRangeInput.placeholder = `e.g., 1-${pageCount} or 1,3,5`;
    } catch (error) {
        splitStatus.textContent = `Error: ${error.message}`;
        splitStatus.className = 'status error';
    }
});

splitBtn.addEventListener('click', async () => {
    if (!splitPdfDoc) return;

    const rangeStr = pageRangeInput.value.trim();
    if (!rangeStr) {
        splitStatus.textContent = 'Please enter page numbers to extract';
        splitStatus.className = 'status error';
        return;
    }

    try {
        splitStatus.textContent = 'Splitting PDF...';
        splitStatus.className = 'status info';

        const totalPages = splitPdfDoc.getPageCount();
        const pageIndices = parsePageRange(rangeStr, totalPages);

        if (pageIndices.length === 0) {
            splitStatus.textContent = 'No valid pages found in range';
            splitStatus.className = 'status error';
            return;
        }

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(splitPdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        downloadPDF(pdfBytes, `split-pages-${rangeStr.replace(/,/g, '_')}.pdf`);

        splitStatus.textContent = `Successfully extracted ${pageIndices.length} page(s)!`;
        splitStatus.className = 'status success';
    } catch (error) {
        splitStatus.textContent = `Error: ${error.message}`;
        splitStatus.className = 'status error';
    }
});

// ============ MERGE PDFs ============
const mergeInput = document.getElementById('mergeInput');
const mergeFiles = document.getElementById('mergeFiles');
const mergeBtn = document.getElementById('mergeBtn');
const mergeStatus = document.getElementById('mergeStatus');

let filesToMerge = [];

function updateMergeFileList() {
    if (filesToMerge.length === 0) {
        mergeFiles.innerHTML = '';
        mergeBtn.classList.add('hidden');
        mergeStatus.textContent = '';
        return;
    }

    mergeFiles.innerHTML = `
        <h4>Files to merge:</h4>
        <div class="file-list-scrollable">
            ${filesToMerge.map((f, i) => `
                <div class="file-item">
                    <span class="file-number">${i + 1}.</span>
                    <span class="file-name">${f.name}</span>
                    <button class="delete-btn" data-index="${i}" title="Remove file">×</button>
                </div>
            `).join('')}
        </div>
    `;

    // Add event listeners to delete buttons
    mergeFiles.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            filesToMerge.splice(index, 1);
            updateMergeFileList();
        });
    });

    mergeBtn.classList.remove('hidden');
    mergeStatus.textContent = `${filesToMerge.length} file(s) ready to merge`;
    mergeStatus.className = 'status info';
}

mergeInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);

    if (newFiles.length > 0) {
        // Append new files instead of replacing
        filesToMerge.push(...newFiles);
        updateMergeFileList();
    }

    // Reset input so same file can be added again if needed
    mergeInput.value = '';
});

mergeBtn.addEventListener('click', async () => {
    if (filesToMerge.length === 0) return;

    try {
        mergeStatus.textContent = 'Merging PDFs...';
        mergeStatus.className = 'status info';

        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < filesToMerge.length; i++) {
            mergeStatus.textContent = `Processing file ${i + 1} of ${filesToMerge.length}...`;
            const arrayBuffer = await readFileAsArrayBuffer(filesToMerge[i]);
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        downloadPDF(pdfBytes, 'merged-document.pdf');

        mergeStatus.textContent = `Successfully merged ${filesToMerge.length} PDFs!`;
        mergeStatus.className = 'status success';
    } catch (error) {
        mergeStatus.textContent = `Error: ${error.message}`;
        mergeStatus.className = 'status error';
    }
});

// ============ IMAGE TO PDF ============
const imageInput = document.getElementById('imageInput');
const imageFiles = document.getElementById('imageFiles');
const convertBtn = document.getElementById('convertBtn');
const convertStatus = document.getElementById('convertStatus');

let imagesToConvert = [];

imageInput.addEventListener('change', (e) => {
    imagesToConvert = Array.from(e.target.files);

    if (imagesToConvert.length > 0) {
        imageFiles.innerHTML = '<h4>Images to convert:</h4>' +
            imagesToConvert.map((f, i) => `<div class="file-item">${i + 1}. ${f.name}</div>`).join('');
        convertBtn.classList.remove('hidden');
        convertStatus.textContent = `${imagesToConvert.length} image(s) selected`;
        convertStatus.className = 'status info';
    }
});

convertBtn.addEventListener('click', async () => {
    if (imagesToConvert.length === 0) return;

    try {
        convertStatus.textContent = 'Converting images to PDF...';
        convertStatus.className = 'status info';

        const pdfDoc = await PDFDocument.create();

        for (let i = 0; i < imagesToConvert.length; i++) {
            convertStatus.textContent = `Processing image ${i + 1} of ${imagesToConvert.length}...`;
            const imageFile = imagesToConvert[i];
            const arrayBuffer = await readFileAsArrayBuffer(imageFile);

            let image;
            if (imageFile.type === 'image/png') {
                image = await pdfDoc.embedPng(arrayBuffer);
            } else if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
                image = await pdfDoc.embedJpg(arrayBuffer);
            } else {
                throw new Error(`Unsupported image type: ${imageFile.type}`);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        downloadPDF(pdfBytes, 'converted-images.pdf');

        convertStatus.textContent = `Successfully converted ${imagesToConvert.length} image(s) to PDF!`;
        convertStatus.className = 'status success';
    } catch (error) {
        convertStatus.textContent = `Error: ${error.message}`;
        convertStatus.className = 'status error';
    }
});

// ============ PDF INFO ============
const infoInput = document.getElementById('infoInput');
const infoPreview = document.getElementById('infoPreview');
const pdfInfo = document.getElementById('pdfInfo');

infoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        pdfInfo.innerHTML = '<div class="status info">Loading PDF information...</div>';

        // Render preview
        await renderPDFPreview(file, infoPreview);

        const arrayBuffer = await readFileAsArrayBuffer(file);
        const pdf = await PDFDocument.load(arrayBuffer);

        const pageCount = pdf.getPageCount();
        const title = pdf.getTitle() || 'N/A';
        const author = pdf.getAuthor() || 'N/A';
        const subject = pdf.getSubject() || 'N/A';
        const creator = pdf.getCreator() || 'N/A';
        const producer = pdf.getProducer() || 'N/A';
        const creationDate = pdf.getCreationDate();
        const modificationDate = pdf.getModificationDate();

        pdfInfo.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <strong>File Name:</strong>
                    <span>${file.name}</span>
                </div>
                <div class="info-item">
                    <strong>File Size:</strong>
                    <span>${(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <div class="info-item">
                    <strong>Page Count:</strong>
                    <span>${pageCount}</span>
                </div>
                <div class="info-item">
                    <strong>Title:</strong>
                    <span>${title}</span>
                </div>
                <div class="info-item">
                    <strong>Author:</strong>
                    <span>${author}</span>
                </div>
                <div class="info-item">
                    <strong>Subject:</strong>
                    <span>${subject}</span>
                </div>
                <div class="info-item">
                    <strong>Creator:</strong>
                    <span>${creator}</span>
                </div>
                <div class="info-item">
                    <strong>Producer:</strong>
                    <span>${producer}</span>
                </div>
                ${creationDate ? `
                <div class="info-item">
                    <strong>Created:</strong>
                    <span>${creationDate.toLocaleString()}</span>
                </div>` : ''}
                ${modificationDate ? `
                <div class="info-item">
                    <strong>Modified:</strong>
                    <span>${modificationDate.toLocaleString()}</span>
                </div>` : ''}
            </div>
        `;
    } catch (error) {
        pdfInfo.innerHTML = `<div class="status error">Error: ${error.message}</div>`;
    }
});
