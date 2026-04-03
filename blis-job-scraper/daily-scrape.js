#!/usr/bin/env node

/**
 * Daily Job Scraper with Deduplication
 * 
 * This script:
 * 1. Scrapes jobs from all companies (Blis, Uber, SoundHound, Intuit)
 * 2. Compares with existing master sheets
 * 3. Updates master sheets with ALL jobs (never deleted)
 * 4. Creates daily sheets with ONLY NEW jobs
 * 
 * Usage:
 *   node daily-scrape.js
 *   npm run daily-scrape
 */

import { BlisScraper } from './src/scraper.js';
import { UberScraper } from './src/uberScraper.js';
import { SoundHoundScraper } from './src/soundhoundScraper.js';
import { IntuitScraper } from './src/intuitScraper.js';
import { FlipkartScraper } from './src/flipkartScraper.js';
import { processCompanyJobs } from './src/utils/jobDeduplication.js';
import { logger } from './src/utils/logger.js';

async function dailyScrape() {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  console.log('\n' + '='.repeat(70));
  console.log('🤖 DAILY JOB SCRAPER WITH DEDUPLICATION');
  console.log('='.repeat(70));
  console.log(`📅 Date: ${today}`);
  console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(70) + '\n');
  
  const results = {};
  const companies = [
    { name: 'Blis', Scraper: BlisScraper },
    { name: 'Uber', Scraper: UberScraper },
    { name: 'SoundHound', Scraper: SoundHoundScraper },
    { name: 'Intuit', Scraper: IntuitScraper },
    { name: 'Flipkart', Scraper: FlipkartScraper }
  ];
  
  try {
    for (const { name, Scraper } of companies) {
      logger.section(`Scraping ${name} Jobs`);
      
      try {
        const scraper = new Scraper();
        const jobs = await scraper.scrape();
        logger.success(`✓ Scraped ${jobs.length} jobs from ${name}`);
        
        // Process with deduplication
        results[name] = processCompanyJobs(name, jobs);
        
      } catch (error) {
        logger.error(`✗ Failed to scrape ${name}: ${error.message}`);
        results[name] = { error: error.message, newJobs: [], totalJobs: 0 };
      }
    }
    
    // Calculate totals
    const totalNew = Object.values(results).reduce((sum, r) => sum + (r.newJobs?.length || 0), 0);
    const totalInMasters = Object.values(results).reduce((sum, r) => sum + (r.totalJobs || 0), 0);
    
    // Final Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 DAILY SCRAPE SUMMARY');
    console.log('='.repeat(70));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✨ New jobs found today: ${totalNew}`);
    console.log(`📚 Total jobs in all masters: ${totalInMasters}`);
    console.log('');
    
    console.log('📋 BREAKDOWN:');
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
    
    console.log('\n' + '='.repeat(70));
    
    if (totalNew > 0) {
      console.log('\n🎉 SUCCESS! Found new jobs today!');
      console.log('📁 Check the daily sheets for new job listings');
    } else {
      console.log('\nℹ️  No new jobs found today');
      console.log('📁 Master sheets are up to date');
    }
    
    console.log('\n💡 TIP: Master sheets contain ALL jobs ever scraped');
    console.log('💡 TIP: Daily sheets contain only NEW jobs from today\n');
    
    logger.success('Daily scrape completed! 🎉');
    
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.warning('\nProcess interrupted by user');
  process.exit(0);
});

// Run
dailyScrape();

// Made with Bob
