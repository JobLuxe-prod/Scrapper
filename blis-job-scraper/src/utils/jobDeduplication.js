import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Job Deduplication and Master Sheet Manager
 * Maintains a master sheet with all jobs and creates daily sheets with only new jobs
 */
export class JobDeduplicationManager {
  constructor(company) {
    this.company = company;
    this.outputDir = path.join(process.cwd(), 'output');
    this.masterFile = path.join(this.outputDir, `${company}_master.xlsx`);
    this.existingJobIds = new Set();
    this.existingJobs = [];
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Load existing job IDs from master sheet
   */
  loadExistingJobIds() {
    this.ensureOutputDir();

    if (!fs.existsSync(this.masterFile)) {
      console.log(`📋 No master file found for ${this.company}. Will create new one.`);
      return;
    }

    try {
      const workbook = XLSX.readFile(this.masterFile);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      this.existingJobs = data;
      
      // Extract job IDs (using URL as unique identifier)
      data.forEach(job => {
        if (job.URL || job.url) {
          const jobId = job.URL || job.url;
          this.existingJobIds.add(jobId);
        }
        // Also add ID field if present
        if (job.ID || job.id) {
          this.existingJobIds.add(job.ID || job.id);
        }
      });

      console.log(`✅ Loaded ${this.existingJobIds.size} existing job IDs from master sheet`);
    } catch (error) {
      console.error(`❌ Error loading master file: ${error.message}`);
    }
  }

  /**
   * Filter out jobs that already exist in master sheet
   * @param {Array} newJobs - Array of Job objects
   * @returns {Array} - Array of new jobs only
   */
  filterNewJobs(newJobs) {
    const newJobsOnly = newJobs.filter(job => {
      const jobData = job.toJSON ? job.toJSON() : job;
      const jobId = jobData.url || jobData.id;
      return !this.existingJobIds.has(jobId);
    });

    console.log(`🔍 Found ${newJobsOnly.length} new jobs out of ${newJobs.length} total jobs`);
    return newJobsOnly;
  }

  /**
   * Update master sheet with new jobs
   * @param {Array} allJobs - All jobs including new ones
   */
  updateMasterSheet(allJobs) {
    this.ensureOutputDir();

    // Convert jobs to plain objects
    const jobsData = allJobs.map(job => {
      const data = job.toJSON ? job.toJSON() : job;
      return {
        'ID': data.id,
        'Title': data.title,
        'Company': data.company,
        'Department': data.department || '',
        'Location': data.location,
        'Work Type': data.workType || '',
        'Experience Level': data.experienceLevel || '',
        'Description': data.description,
        'URL': data.url,
        'Apply URL': data.applyUrl || data.url,
        'Scraped At': data.scrapedAt || new Date().toISOString()
      };
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(jobsData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 },  // ID
      { wch: 50 },  // Title
      { wch: 15 },  // Company
      { wch: 25 },  // Department
      { wch: 30 },  // Location
      { wch: 15 },  // Work Type
      { wch: 20 },  // Experience Level
      { wch: 100 }, // Description
      { wch: 70 },  // URL
      { wch: 70 },  // Apply URL
      { wch: 25 }   // Scraped At
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Jobs');
    
    XLSX.writeFile(workbook, this.masterFile);
    console.log(`✅ Updated master sheet: ${this.masterFile}`);
    console.log(`   Total jobs in master: ${jobsData.length}`);
  }

  /**
   * Create daily scrape sheet with only new jobs
   * @param {Array} newJobs - Array of new Job objects
   * @returns {string} - Path to created file
   */
  createDailySheet(newJobs) {
    this.ensureOutputDir();

    if (newJobs.length === 0) {
      console.log(`ℹ️  No new jobs to save for ${this.company}`);
      return null;
    }

    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dailyFile = path.join(this.outputDir, `${this.company}_new_${timestamp}.xlsx`);

    // Convert jobs to plain objects
    const jobsData = newJobs.map(job => {
      const data = job.toJSON ? job.toJSON() : job;
      return {
        'ID': data.id,
        'Title': data.title,
        'Company': data.company,
        'Department': data.department || '',
        'Location': data.location,
        'Work Type': data.workType || '',
        'Experience Level': data.experienceLevel || '',
        'Description': data.description,
        'URL': data.url,
        'Apply URL': data.applyUrl || data.url,
        'Scraped At': data.scrapedAt || new Date().toISOString()
      };
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(jobsData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 },  // ID
      { wch: 50 },  // Title
      { wch: 15 },  // Company
      { wch: 25 },  // Department
      { wch: 30 },  // Location
      { wch: 15 },  // Work Type
      { wch: 20 },  // Experience Level
      { wch: 100 }, // Description
      { wch: 70 },  // URL
      { wch: 70 },  // Apply URL
      { wch: 25 }   // Scraped At
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'New Jobs');
    
    XLSX.writeFile(workbook, dailyFile);
    console.log(`✅ Created daily sheet: ${dailyFile}`);
    console.log(`   New jobs: ${jobsData.length}`);

    return dailyFile;
  }

  /**
   * Process scraped jobs: filter new ones, update master, create daily sheet
   * @param {Array} scrapedJobs - Array of Job objects from scraper
   * @returns {Object} - Object with newJobs, masterFile, dailyFile
   */
  processScrapedJobs(scrapedJobs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Processing ${this.company} Jobs`);
    console.log('='.repeat(60));

    // Load existing job IDs
    this.loadExistingJobIds();

    // Filter new jobs
    const newJobs = this.filterNewJobs(scrapedJobs);

    // Combine existing and new jobs for master sheet
    const allJobs = [...this.existingJobs, ...newJobs.map(j => j.toJSON ? j.toJSON() : j)];

    // Update master sheet
    this.updateMasterSheet(allJobs);

    // Create daily sheet with new jobs only
    const dailyFile = this.createDailySheet(newJobs);

    console.log('='.repeat(60));
    console.log(`✅ ${this.company} Processing Complete`);
    console.log(`   - Total jobs in master: ${allJobs.length}`);
    console.log(`   - New jobs today: ${newJobs.length}`);
    console.log('='.repeat(60) + '\n');

    return {
      newJobs,
      totalJobs: allJobs.length,
      masterFile: this.masterFile,
      dailyFile
    };
  }

  /**
   * Get statistics about jobs
   */
  getStats() {
    return {
      company: this.company,
      totalJobsInMaster: this.existingJobIds.size,
      masterFile: this.masterFile
    };
  }
}

/**
 * Helper function to process jobs for a specific company
 * @param {string} company - Company name (e.g., 'Intuit', 'Uber', 'Blis')
 * @param {Array} jobs - Array of Job objects
 */
export function processCompanyJobs(company, jobs) {
  const manager = new JobDeduplicationManager(company);
  return manager.processScrapedJobs(jobs);
}

export default JobDeduplicationManager;

// Made with Bob
