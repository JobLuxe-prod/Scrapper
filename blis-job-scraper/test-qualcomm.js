#!/usr/bin/env node

import { QualcommScraper } from './src/qualcommScraper.js';
import { saveToJSON, saveToCSV, saveToExcel } from './src/utils/fileUtils.js';
import { logger } from './src/utils/logger.js';

/**
 * Test script for Qualcomm scraper
 */
async function testQualcommScraper() {
  const startTime = Date.now();
  
  logger.section('Testing Qualcomm Job Scraper');
  logger.info('Starting Qualcomm scraping test...');
  
  try {
    const scraper = new QualcommScraper();
    const jobs = await scraper.scrape();
    
    if (jobs.length === 0) {
      logger.warning('No jobs found!');
      return;
    }
    
    logger.section('Saving Results');
    
    // Save to different formats
    const jsonPath = saveToJSON(jobs, 'qualcomm_jobs.json');
    const csvPath = saveToCSV(jobs, 'qualcomm_jobs.csv');
    const excelPath = saveToExcel(jobs, 'qualcomm_jobs.xlsx');
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.section('Test Summary');
    logger.success(`Total jobs scraped: ${jobs.length}`);
    logger.success(`Time taken: ${duration}s`);
    
    console.log('\n📁 OUTPUT FILES:');
    logger.info(`JSON: ${jsonPath}`);
    logger.info(`CSV: ${csvPath}`);
    logger.info(`Excel: ${excelPath}`);
    
    // Display sample jobs
    logger.section('Sample Jobs');
    jobs.slice(0, 5).forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title}`);
      console.log(`   Department: ${job.department}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Experience: ${job.experienceLevel}`);
      console.log(`   URL: ${job.url}`);
    });
    
    if (jobs.length > 5) {
      console.log(`\n... and ${jobs.length - 5} more jobs`);
    }
    
    logger.section('Test Complete!');
    logger.success('Qualcomm scraping test completed successfully! 🎉');
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.warning('\nTest interrupted by user');
  process.exit(0);
});

// Run the test
testQualcommScraper();

// Made with Bob