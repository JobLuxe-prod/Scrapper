#!/usr/bin/env node

import { BlisScraper } from './scraper.js';
import { UberScraper } from './uberScraper.js';
import { SoundHoundScraper } from './soundhoundScraper.js';
import { IntuitScraper } from './intuitScraper.js';
import { FlipkartScraper } from './flipkartScraper.js';
import { QualcommScraper } from './qualcommScraper.js';
import { cleanOutputDirectory, saveToJSON, saveToCSV, saveToExcel } from './utils/fileUtils.js';
import { processCompanyJobs } from './utils/jobDeduplication.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

/**
 * Main function to run the scraper
 */
async function main() {
  const startTime = Date.now();
  
  logger.section('Multi-Company Job Scraper');
  logger.info('Starting job scraping process...');
  logger.info('Scraping from: Blis, Uber, SoundHound, Intuit, Flipkart & Qualcomm');
  
  try {
    let allJobs = [];
    const results = {};
    const companies = [
      { name: 'Blis', Scraper: BlisScraper },
      { name: 'Uber', Scraper: UberScraper },
      { name: 'SoundHound', Scraper: SoundHoundScraper },
      { name: 'Intuit', Scraper: IntuitScraper },
      { name: 'Flipkart', Scraper: FlipkartScraper },
      { name: 'Qualcomm', Scraper: QualcommScraper }
    ];
    
    // Scrape each company and process with deduplication
    for (const { name, Scraper } of companies) {
      logger.section(`Scraping ${name} Jobs`);
      
      try {
        const scraper = new Scraper();
        const jobs = await scraper.scrape();
        logger.success(`✓ Scraped ${jobs.length} jobs from ${name}`);
        
        // Process with deduplication and create master sheets
        results[name] = processCompanyJobs(name, jobs);
        allJobs = allJobs.concat(jobs);
        
      } catch (error) {
        logger.error(`✗ Failed to scrape ${name}: ${error.message}`);
        results[name] = { error: error.message, newJobs: [], totalJobs: 0 };
      }
    }
    
    if (allJobs.length === 0) {
      logger.warning('No jobs found!');
      return;
    }
    
    // Calculate totals
    const totalNew = Object.values(results).reduce((sum, r) => sum + (r.newJobs?.length || 0), 0);
    const totalInMasters = Object.values(results).reduce((sum, r) => sum + (r.totalJobs || 0), 0);
    
    // Save combined results (optional - for backward compatibility)
    logger.section('Saving Combined Results');
    const jsonPath = saveToJSON(allJobs, config.output.jsonFile);
    const csvPath = saveToCSV(allJobs, config.output.csvFile);
    const excelPath = saveToExcel(allJobs, config.output.excelFile, config.output.separateSheetsByCompany);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.section('Summary');
    logger.success(`Total jobs scraped: ${allJobs.length}`);
    logger.success(`New jobs found: ${totalNew}`);
    logger.success(`Total jobs in all masters: ${totalInMasters}`);
    logger.success(`Time taken: ${duration}s`);
    
    console.log('\n📋 BREAKDOWN BY COMPANY:');
    console.log('-'.repeat(70));
    for (const [company, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`\n❌ ${company}: ERROR - ${result.error}`);
      } else {
        console.log(`\n✅ ${company}:`);
        console.log(`   New jobs: ${result.newJobs.length}`);
        console.log(`   Total in master: ${result.totalJobs}`);
        console.log(`   Master: ${result.masterFile}`);
        if (result.dailyFile) {
          console.log(`   Daily: ${result.dailyFile}`);
        }
      }
    }
    
    console.log('\n📁 COMBINED OUTPUT FILES:');
    logger.info(`JSON: ${jsonPath}`);
    logger.info(`CSV: ${csvPath}`);
    logger.info(`Excel: ${excelPath}`);
    
    console.log('\n💡 TIP: Master sheets contain ALL jobs ever scraped');
    console.log('💡 TIP: Daily sheets contain only NEW jobs from today');
    
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
