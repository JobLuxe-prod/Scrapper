import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure directory exists
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Clean output directory by removing all files except .gitkeep
 */
export function cleanOutputDirectory() {
  const outputDir = path.join(process.cwd(), 'output');
  ensureDirectoryExists(outputDir);
  
  const files = fs.readdirSync(outputDir);
  let deletedCount = 0;
  
  files.forEach(file => {
    // Skip .gitkeep and .DS_Store files
    if (file === '.gitkeep' || file === '.DS_Store') {
      return;
    }
    
    const filePath = path.join(outputDir, file);
    try {
      // Check if it's a file (not a directory)
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️  Deleted: ${file}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not delete ${file}: ${error.message}`);
    }
  });
  
  if (deletedCount > 0) {
    console.log(`✅ Cleaned output directory: ${deletedCount} file(s) deleted`);
  } else {
    console.log(`✅ Output directory is already clean`);
  }
  
  return deletedCount;
}

/**
 * Save jobs to JSON file
 */
export function saveToJSON(jobs, filename) {
  const outputDir = path.join(process.cwd(), 'output');
  ensureDirectoryExists(outputDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = filename.replace('.json', `-${timestamp}.json`);
  const filePath = path.join(outputDir, finalFilename);
  
  const data = {
    scrapedAt: new Date().toISOString(),
    totalJobs: jobs.length,
    jobs: jobs.map(job => job.toJSON())
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${jobs.length} jobs to ${filePath}`);
  
  return filePath;
}

/**
 * Save jobs to CSV file
 */
export function saveToCSV(jobs, filename) {
  const outputDir = path.join(process.cwd(), 'output');
  ensureDirectoryExists(outputDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = filename.replace('.csv', `-${timestamp}.csv`);
  const filePath = path.join(outputDir, finalFilename);
  
  const csvContent = [
    jobs[0].constructor.getCSVHeader(),
    ...jobs.map(job => job.toCSV())
  ].join('\n');
  
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Saved ${jobs.length} jobs to ${filePath}`);
  
  return filePath;
}

/**
 * Save jobs to Excel file with separate sheets by company
 */
export function saveToExcel(jobs, filename, separateByCompany = true) {
  const outputDir = path.join(process.cwd(), 'output');
  ensureDirectoryExists(outputDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalFilename = filename.replace('.xlsx', `-${timestamp}.xlsx`);
  const filePath = path.join(outputDir, finalFilename);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  if (separateByCompany) {
    // Group jobs by company
    const jobsByCompany = {};
    jobs.forEach(job => {
      const jobData = job.toJSON();
      const company = jobData.company || jobData.department || 'Unknown';
      if (!jobsByCompany[company]) {
        jobsByCompany[company] = [];
      }
      jobsByCompany[company].push(jobData);
    });
    
    // Create a sheet for each company
    Object.keys(jobsByCompany).sort().forEach(company => {
      const companyJobs = jobsByCompany[company];
      const worksheetData = [
        ['Title', 'Company', 'Location', 'Experience Level', 'Job Type', 'Description', 'Apply URL']
      ];
      
      companyJobs.forEach(jobData => {
        worksheetData.push([
          jobData.title,
          jobData.company,
          jobData.location,
          jobData.experienceLevel,
          jobData.workType,
          jobData.description,
          jobData.applyUrl || jobData.url
        ]);
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 50 }, // Title
        { wch: 25 }, // Company
        { wch: 30 }, // Location
        { wch: 20 }, // Experience Level
        { wch: 15 }, // Job Type
        { wch: 100 }, // Description
        { wch: 70 }  // Apply URL
      ];
      
      // Sanitize sheet name (Excel has 31 char limit and doesn't allow certain chars)
      const sheetName = company.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '-');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    console.log(`✅ Saved ${jobs.length} jobs across ${Object.keys(jobsByCompany).length} company sheets to ${filePath}`);
  } else {
    // Single sheet with all jobs
    const worksheetData = [
      ['Title', 'Company', 'Location', 'Experience Level', 'Job Type', 'Description', 'Apply URL']
    ];
    
    jobs.forEach(job => {
      const jobData = job.toJSON();
      worksheetData.push([
        jobData.title,
        jobData.company,
        jobData.location,
        jobData.experienceLevel,
        jobData.workType,
        jobData.description,
        jobData.applyUrl || jobData.url
      ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Title
      { wch: 25 }, // Company
      { wch: 30 }, // Location
      { wch: 20 }, // Experience Level
      { wch: 15 }, // Job Type
      { wch: 100 }, // Description
      { wch: 70 }  // Apply URL
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Jobs');
    console.log(`✅ Saved ${jobs.length} jobs to ${filePath}`);
  }
  
  XLSX.writeFile(workbook, filePath);
  
  return filePath;
}

/**
 * Read existing jobs from JSON file
 */
export function readFromJSON(filename) {
  const outputDir = path.join(process.cwd(), 'output');
  const filePath = path.join(outputDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.jobs || [];
}

export default {
  ensureDirectoryExists,
  cleanOutputDirectory,
  saveToJSON,
  saveToCSV,
  saveToExcel,
  readFromJSON
};

// Made with Bob
