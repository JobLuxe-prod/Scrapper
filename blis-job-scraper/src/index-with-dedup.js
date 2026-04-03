#!/usr/bin/env node

import { BlisScraper } from './scraper.js';
import { UberScraper } from './uberScraper.js';
import { SoundHoundScraper } from './soundhoundScraper.js';
import { IntuitScraper } from './intuitScraper.js';
import { processCompanyJobs } from './utils/jobDeduplication.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

/**
 * Main function to run the scraper with deduplication
 */
async function main() {
  const startTime = Date.now();
  
  logger.section('Multi-Company Job Scraper with Deduplication');
  logger.info('Starting job scraping process...');
  logger.info('Scraping from: Blis, Uber, SoundHound & Intuit');
  logger.info('📊 Master sheets will be updated with ALL jobs');
  logger.info('📅 Daily sheets will contain ONLY NEW jobs');
  
  try {
    const results = {
      blis: null,
      uber: null,
      soundhound: null,
      intuit: null
    };
    
    // Scrape Blis jobs
    logger.section('Scraping Blis Jobs');
    const blisScraper = new BlisScraper();
    const blisJobs = await blisScraper.scrape();
    logger.success(`Scraped ${blisJobs.length} jobs from Blis`);
    
    // Process Blis jobs with deduplication
    results.blis = processCompanyJobs('Blis', blisJobs);
    
    // Scrape Uber jobs
    logger.section('Scraping Uber Jobs');
    const uberScraper = new UberScraper();
    const uberJobs = await uberScraper.scrape();
    logger.success(`Scraped ${uberJobs.length} jobs from Uber`);
    
    // Process Uber jobs with deduplication
    results.uber = processCompanyJobs('Uber', uberJobs);
    
    // Scrape SoundHound jobs
    logger.section('Scraping SoundHound Jobs');
    const soundhoundScraper = new SoundHoundScraper();
    const soundhoundJobs = await soundhoundScraper.scrape();
    logger.success(`Scraped ${soundhoundJobs.length} jobs from SoundHound`);
    
    // Process SoundHound jobs with deduplication
    results.soundhound = processCompanyJobs('SoundHound', soundhoundJobs);
    
    // Scrape Intuit jobs
    logger.section('Scraping Intuit Jobs');
    const intuitScraper = new IntuitScraper();
    const intuitJobs = await intuitScraper.scrape();
    logger.success(`Scraped ${intuitJobs.length} jobs from Intuit`);
    
    // Process Intuit jobs with deduplication
    results.intuit = processCompanyJobs('Intuit', intuitJobs);
    
    // Calculate totals
    const totalScraped = blisJobs.length + uberJobs.length + soundhoundJobs.length + intuitJobs.length;
    const totalNew = (results.blis?.newJobs.length || 0) + 
                     (results.uber?.newJobs.length || 0) + 
                     (results.soundhound?.newJobs.length || 0) + 
                     (results.intuit?.newJobs.length || 0);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.section('📊 Final Summary');
    console.log('\n' + '='.repeat(70));
    console.log('SCRAPING RESULTS');
    console.log('='.repeat(70));
    console.log(`⏱️  Time taken: ${duration}s`);
    console.log(`📥 Total jobs scraped: ${totalScraped}`);
    console.log(`✨ New jobs found: ${totalNew}`);
    console.log('');
    
    console.log('📋 BREAKDOWN BY COMPANY:');
    console.log('-'.repeat(70));
    
    if (results.blis) {
      console.log(`\n🔵 Blis:`);
      console.log(`   - Scraped: ${blisJobs.length} jobs`);
      console.log(`   - New: ${results.blis.newJobs.length} jobs`);
      console.log(`   - Total in master: ${results.blis.totalJobs} jobs`);
      console.log(`   - Master file: ${results.blis.masterFile}`);
      if (results.blis.dailyFile) {
        console.log(`   - Daily file: ${results.blis.dailyFile}`);
      }
    }
    
    if (results.uber) {
      console.log(`\n🚗 Uber:`);
      console.log(`   - Scraped: ${uberJobs.length} jobs`);
      console.log(`   - New: ${results.uber.newJobs.length} jobs`);
      console.log(`   - Total in master: ${results.uber.totalJobs} jobs`);
      console.log(`   - Master file: ${results.uber.masterFile}`);
      if (results.uber.dailyFile) {
        console.log(`   - Daily file: ${results.uber.dailyFile}`);
      }
    }
    
    if (results.soundhound) {
      console.log(`\n🎵 SoundHound:`);
      console.log(`   - Scraped: ${soundhoundJobs.length} jobs`);
      console.log(`   - New: ${results.soundhound.newJobs.length} jobs`);
      console.log(`   - Total in master: ${results.soundhound.totalJobs} jobs`);
      console.log(`   - Master file: ${results.soundhound.masterFile}`);
      if (results.soundhound.dailyFile) {
        console.log(`   - Daily file: ${results.soundhound.dailyFile}`);
      }
    }
    
    if (results.intuit) {
      console.log(`\n💼 Intuit:`);
      console.log(`   - Scraped: ${intuitJobs.length} jobs`);
      console.log(`   - New: ${results.intuit.newJobs.length} jobs`);
      console.log(`   - Total in master: ${results.intuit.totalJobs} jobs`);
      console.log(`   - Master file: ${results.intuit.masterFile}`);
      if (results.intuit.dailyFile) {
        console.log(`   - Daily file: ${results.intuit.dailyFile}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📁 OUTPUT FILES:');
    console.log('-'.repeat(70));
    console.log('\n🗂️  Master Sheets (ALL jobs ever scraped):');
    console.log(`   - ${results.blis?.masterFile || 'N/A'}`);
    console.log(`   - ${results.uber?.masterFile || 'N/A'}`);
    console.log(`   - ${results.soundhound?.masterFile || 'N/A'}`);
    console.log(`   - ${results.intuit?.masterFile || 'N/A'}`);
    
    if (totalNew > 0) {
      console.log('\n📅 Daily Sheets (NEW jobs only):');
      if (results.blis?.dailyFile) console.log(`   - ${results.blis.dailyFile}`);
      if (results.uber?.dailyFile) console.log(`   - ${results.uber.dailyFile}`);
      if (results.soundhound?.dailyFile) console.log(`   - ${results.soundhound.dailyFile}`);
      if (results.intuit?.dailyFile) console.log(`   - ${results.intuit.dailyFile}`);
    } else {
      console.log('\n📅 No new jobs found today - no daily sheets created');
    }
    
    console.log('\n' + '='.repeat(70));
    
    // Display sample new jobs
    if (totalNew > 0) {
      logger.section('🆕 Sample New Jobs');
      let sampleCount = 0;
      const maxSamples = 5;
      
      for (const company of ['blis', 'uber', 'soundhound', 'intuit']) {
        if (results[company]?.newJobs.length > 0 && sampleCount < maxSamples) {
          results[company].newJobs.slice(0, maxSamples - sampleCount).forEach((job, index) => {
            const jobData = job.toJSON ? job.toJSON() : job;
            console.log(`\n${sampleCount + 1}. ${jobData.title}`);
            console.log(`   Company: ${jobData.company}`);
            console.log(`   Location: ${jobData.location}`);
            console.log(`   Experience: ${jobData.experienceLevel}`);
            console.log(`   URL: ${jobData.url}`);
            sampleCount++;
          });
        }
      }
      
      if (totalNew > maxSamples) {
        console.log(`\n... and ${totalNew - maxSamples} more new jobs`);
      }
    }
    
    logger.section('✅ Done!');
    logger.success('Scraping completed successfully! 🎉');
    console.log('\n💡 TIP: Master sheets contain ALL jobs, daily sheets contain only NEW jobs\n');
    
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