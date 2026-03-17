#!/usr/bin/env node

import { BlisScraper } from './scraper.js';
import { UberScraper } from './uberScraper.js';
import { SoundHoundScraper } from './soundhoundScraper.js';
import { cleanOutputDirectory, saveToJSON, saveToCSV, saveToExcel } from './utils/fileUtils.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

/**
 * Main function to run the scraper
 */
async function main() {
  const startTime = Date.now();
  
  logger.section('Multi-Company Job Scraper');
  logger.info('Starting job scraping process...');
  logger.info('Scraping from: Blis, Uber & SoundHound');
  
  try {
    // Clean output directory before scraping
    logger.section('Cleaning Output Directory');
    cleanOutputDirectory();
    
    let allJobs = [];
    
    // Scrape Blis jobs
    logger.section('Scraping Blis Jobs');
    const blisScraper = new BlisScraper();
    const blisJobs = await blisScraper.scrape();
    logger.success(`Scraped ${blisJobs.length} jobs from Blis`);
    allJobs = allJobs.concat(blisJobs);
    
    // Scrape Uber jobs
    logger.section('Scraping Uber Jobs');
    const uberScraper = new UberScraper();
    const uberJobs = await uberScraper.scrape();
    logger.success(`Scraped ${uberJobs.length} jobs from Uber`);
    allJobs = allJobs.concat(uberJobs);
    
    // Scrape SoundHound jobs
    logger.section('Scraping SoundHound Jobs');
    const soundhoundScraper = new SoundHoundScraper();
    const soundhoundJobs = await soundhoundScraper.scrape();
    logger.success(`Scraped ${soundhoundJobs.length} jobs from SoundHound`);
    allJobs = allJobs.concat(soundhoundJobs);
    
    if (allJobs.length === 0) {
      logger.warning('No jobs found!');
      return;
    }
    
    // Save results
    logger.section('Saving Results');
    
    const jsonPath = saveToJSON(allJobs, config.output.jsonFile);
    const csvPath = saveToCSV(allJobs, config.output.csvFile);
    const excelPath = saveToExcel(allJobs, config.output.excelFile, config.output.separateSheetsByCompany);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.section('Summary');
    logger.success(`Total India jobs scraped: ${allJobs.length}`);
    logger.info(`  - Blis: ${blisJobs.length} jobs`);
    logger.info(`  - Uber: ${uberJobs.length} jobs`);
    logger.info(`  - SoundHound: ${soundhoundJobs.length} jobs`);
    logger.success(`Time taken: ${duration}s`);
    logger.info(`JSON output: ${jsonPath}`);
    logger.info(`CSV output: ${csvPath}`);
    logger.info(`Excel output: ${excelPath}`);
    
    // Display sample jobs
    logger.section('Sample Jobs');
    allJobs.slice(0, 5).forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title}`);
      console.log(`   Department: ${job.department}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Experience: ${job.experienceLevel}`);
      console.log(`   URL: ${job.url}`);
    });
    
    if (allJobs.length > 5) {
      console.log(`\n... and ${allJobs.length - 5} more jobs`);
    }
    
    logger.section('Done!');
    logger.success('Scraping completed successfully! 🎉');
    
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
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
  logger.warning('\nProcess interrupted by user');
  process.exit(0);
});

// Run the scraper
main();

// Made with Bob
