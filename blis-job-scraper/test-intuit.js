import { IntuitScraper } from './src/intuitScraper.js';
import { saveToJSON, saveToCSV, saveToExcel } from './src/utils/fileUtils.js';
import { logger } from './src/utils/logger.js';

async function testIntuit() {
  logger.section('Testing Intuit Scraper');
  
  try {
    const scraper = new IntuitScraper();
    const jobs = await scraper.scrape();
    
    logger.section('Results');
    logger.success(`Found ${jobs.length} Intuit jobs`);
    
    if (jobs.length > 0) {
      logger.section('Sample Jobs');
      jobs.slice(0, 3).forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Department: ${job.department}`);
        console.log(`   Experience: ${job.experienceLevel}`);
        console.log(`   Work Type: ${job.workType}`);
        console.log(`   Job URL: ${job.url}`);
        console.log(`   Apply URL: ${job.applyUrl}`);
      });
      
      if (jobs.length > 3) {
        console.log(`\n... and ${jobs.length - 3} more jobs`);
      }
      
      // Save to files
      logger.section('Saving Results');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const jsonPath = saveToJSON(jobs, `intuit-jobs-${timestamp}.json`);
      const csvPath = saveToCSV(jobs, `intuit-jobs-${timestamp}.csv`);
      const excelPath = saveToExcel(jobs, `intuit-india-jobs-${timestamp}.xlsx`, false);
      
      logger.success(`JSON saved: ${jsonPath}`);
      logger.success(`CSV saved: ${csvPath}`);
      logger.success(`Excel saved: ${excelPath}`);
    }
    
    logger.section('Test Complete');
    logger.success('Intuit scraper is working! ✅');
    
  } catch (error) {
    logger.error('Test failed:', error);
    console.error(error);
    process.exit(1);
  }
}

testIntuit();

// Made with Bob
