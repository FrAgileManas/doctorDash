import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// For __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Allow React Router to work with hash-based routing in Electron
      contextIsolation: true,
    //   preload: path.join(__dirname, 'preload.js'), // Optional, for preload scripts
      nodeIntegration: false, // Don't enable nodeIntegration directly
    },
  });

  // Load the React app (you can replace this with your production build or dev server URL)
//   win.loadURL('http://localhost:5174'); // For development, replace with your dev server URL
  // OR if using production build
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // Open DevTools for debugging (optional, remove for production)
  win.webContents.openDevTools();
}

// When the app is ready, create the window
app.whenReady().then(createWindow);

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Recreate the window when the app is activated (macOS specific behavior)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
