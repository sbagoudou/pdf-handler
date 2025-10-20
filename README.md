# PDF Handler

A modern, client-side web application for handling PDF files with ease. Split, merge, convert images to PDF, and view PDF information - all without uploading files to any server!

## Features

### Split PDF
- Extract specific pages from a PDF document
- Support for ranges (e.g., `1-5`) and individual pages (e.g., `1,3,5`)
- Combine both formats (e.g., `1,3-5,7`)

### Merge PDFs
- Combine multiple PDF files into a single document
- Maintains the order of selection
- Supports unlimited number of files

### Image to PDF
- Convert images (PNG, JPEG) to PDF format
- Multiple images create multi-page PDFs
- Maintains original image dimensions

### PDF Info
- View detailed metadata about PDF files
- Shows page count, file size, author, title, and more
- Display creation and modification dates

## Technology Stack

- **pdf-lib**: Pure JavaScript library for creating and modifying PDFs
- **Vite**: Fast development server and build tool
- **Vanilla JavaScript**: No framework dependencies
- **Modern CSS**: Responsive design with CSS Grid and Flexbox

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Build for Production

Create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist` directory. You can preview the production build:

```bash
npm run preview
```

## Usage

### Splitting a PDF

1. Click "Choose PDF to Split" and select your PDF file
2. Enter the pages you want to extract:
   - Single pages: `1,3,5`
   - Range: `1-5`
   - Combined: `1,3-5,7-10`
3. Click "Split PDF" to download the extracted pages

### Merging PDFs

1. Click "Choose PDFs to Merge" and select multiple PDF files
2. Files will be merged in the order they were selected
3. Click "Merge PDFs" to download the combined document

### Converting Images to PDF

1. Click "Choose Images" and select one or more image files (PNG or JPEG)
2. Each image will become a page in the PDF
3. Click "Convert to PDF" to download the result

### Viewing PDF Information

1. Click "Choose PDF" under the PDF Info section
2. View detailed metadata about the file instantly

## Privacy & Security

All PDF processing happens entirely in your browser. No files are uploaded to any server, ensuring your documents remain private and secure.

## Browser Compatibility

Works in all modern browsers that support ES6+ JavaScript:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Acknowledgments

- Built with [pdf-lib](https://pdf-lib.js.org/)
- Bundled with [Vite](https://vitejs.dev/)
