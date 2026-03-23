import { UberScraper } from './src/uberScraper.js';
import { logger } from './src/utils/logger.js';

async function testUber() {
  logger.section('Testing Uber Scraper');
  
  try {
    const scraper = new UberScraper();
    const jobs = await scraper.scrape();
    
    logger.section('Results');
    logger.success(`Found ${jobs.length} Uber jobs`);
    
    if (jobs.length > 0) {
      logger.section('Sample Jobs with Descriptions');
      jobs.slice(0, 2).forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Department: ${job.department}`);
        console.log(`   Experience: ${job.experienceLevel}`);
        console.log(`   Description Length: ${job.description ? job.description.length : 0} characters`);
        console.log(`   Description Preview: ${job.description ? job.description.substring(0, 200) + '...' : 'NO DESCRIPTION'}`);
        console.log(`   Job URL: ${job.url}`);
      });
    }
    
    logger.section('Test Complete');
    
  } catch (error) {
    logger.error('Test failed:', error);
    console.error(error);
    process.exit(1);
  }
}

testUber();

// Made with Bob
