import puppeteer from 'puppeteer';
import { Job } from './models/Job.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

export class SoundHoundScraper {
  constructor() {
    this.baseUrl = 'https://jobs.gem.com/soundhound';
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page
   */
  async init() {
    logger.info('Launching browser...');
    this.browser = await puppeteer.launch({
      headless: config.scraping.headless,
      args: config.browser.args,
      defaultViewport: config.browser.defaultViewport
    });
    
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  /**
   * Scrape all jobs from SoundHound
   */
  async scrape() {
    try {
      await this.init();
      
      logger.info(`Navigating to ${this.baseUrl}...`);
      await this.page.goto(this.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: config.scraping.timeout
      });

      // Wait for job listings to load
      await this.page.waitForSelector('h3, h2, [class*="title"]', {
        timeout: 10000
      }).catch(() => {
        logger.warning('Job listings selector not found, trying alternative approach');
      });

      // Scroll to load all jobs
      await this.autoScroll();

      // Extract job data directly from the listing page
      const jobsData = await this.page.evaluate(() => {
        const jobs = [];
        
        // Find all job title links (they are in h3 or h2 tags)
        const jobTitles = document.querySelectorAll('h3 a, h2 a, a h3, a h2');
        
        jobTitles.forEach(titleLink => {
          const anchor = titleLink.tagName === 'A' ? titleLink : titleLink.closest('a');
          if (!anchor || !anchor.href) return;
          
          const href = anchor.href;
          if (!href.includes('/soundhound/') || href.endsWith('/soundhound') || href.endsWith('/soundhound/')) {
            return;
          }
          
          // Get the job title
          const title = (titleLink.tagName === 'A' ? titleLink.textContent : anchor.textContent).trim();
          
          // Find the parent container to get location and other metadata
          const container = anchor.closest('div[class*="job"]') || anchor.closest('div');
          
          let location = '';
          let department = '';
          
          if (container) {
            // Look for location text
            const textElements = container.querySelectorAll('span, div, p');
            textElements.forEach(el => {
              const text = el.textContent.trim();
              // Check for location patterns
              if (text.match(/Bengaluru|Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|India|Beijing|Tokyo|United States|Remote/i)) {
                if (!location) location = text;
              }
              // Check for department
              else if (text.length > 2 && text.length < 50 && !text.match(/ago|office|time/i)) {
                if (!department && text !== title) department = text;
              }
            });
          }
          
          jobs.push({
            title,
            url: href,
            location,
            department
          });
        });
        
        return jobs;
      });

      logger.info(`Found ${jobsData.length} job listings`);

      // Filter for India jobs and scrape details
      const jobs = [];
      for (let i = 0; i < jobsData.length; i++) {
        const jobData = jobsData[i];
        
        // Check if it's an India job
        if (jobData.location.match(/Bengaluru|Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|India/i)) {
          try {
            logger.info(`Scraping India job ${jobs.length + 1}: ${jobData.title}...`);
            const job = await this.scrapeJobDetails(jobData.url);
            if (job) {
              jobs.push(job);
            }
          } catch (error) {
            logger.error(`Failed to scrape job: ${error.message}`);
          }
        } else {
          logger.info(`Skipping non-India job: ${jobData.title} (${jobData.location})`);
        }
      }

      await this.close();
      return jobs;

    } catch (error) {
      logger.error(`Scraping failed: ${error.message}`);
      await this.close();
      throw error;
    }
  }

  /**
   * Scrape details of a single job
   */
  async scrapeJobDetails(url) {
    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.scraping.timeout
      });

      // Wait for job posting header to load
      await this.page.waitForSelector('[class*="jobPostingHeader"], h1', { timeout: 10000 });

      const jobData = await this.page.evaluate(() => {
        // Extract title from jobPostingHeader or h1
        let title = '';
        const headerElement = document.querySelector('[class*="jobPostingHeader"]');
        if (headerElement) {
          const titleEl = headerElement.querySelector('h1, h2, [class*="title"]');
          title = titleEl ? titleEl.textContent.trim() : headerElement.textContent.trim();
        } else {
          const h1 = document.querySelector('h1');
          title = h1 ? h1.textContent.trim() : '';
        }

        // Extract metadata (location, department, work type)
        let location = '';
        let department = '';
        let workType = '';
        
        // Look in the header area for metadata
        const metadataContainer = document.querySelector('[class*="jobPostingHeader"]') ||
                                 document.querySelector('h1').parentElement;
        
        if (metadataContainer) {
          const allText = metadataContainer.textContent;
          const spans = metadataContainer.querySelectorAll('span, div');
          
          spans.forEach(el => {
            const text = el.textContent.trim();
            
            // Location patterns
            if (text.match(/Bengaluru|Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|India|Beijing|Tokyo|United States/i)) {
              if (!location) location = text;
            }
            // Work type patterns
            else if (text.match(/In office|Remote|Hybrid|Full-time|Part-time|Full.time|Part.time/i)) {
              if (!workType) {
                workType = text;
              } else {
                workType += ', ' + text;
              }
            }
            // Department (usually single words or short phrases, not dates)
            else if (text.length > 2 && text.length < 50 &&
                     !text.match(/ago|year|month|day|week/i) &&
                     !text.match(/\d/)) {
              if (!department && text !== title) {
                department = text;
              }
            }
          });
        }

        // Fallback for department
        if (!department) {
          department = 'SoundHound';
        }

        // Extract description
        let description = '';
        const descriptionContainer = document.querySelector('[class*="description"]') ||
                                    document.querySelector('main') ||
                                    document.querySelector('article');
        
        if (descriptionContainer) {
          const paragraphs = descriptionContainer.querySelectorAll('p, li');
          paragraphs.forEach(p => {
            description += p.textContent.trim() + ' ';
          });
        }
        description = description.trim().substring(0, 500);

        // Extract apply URL
        const applyButton = document.querySelector('a[href*="apply"]') ||
                           document.querySelector('button[class*="apply"]');
        const applyUrl = applyButton ?
          (applyButton.href || window.location.href) : window.location.href;

        return {
          title,
          location,
          department,
          workType,
          description,
          applyUrl,
          url: window.location.href
        };
      });

      // Only include India jobs - check for Bengaluru, Bangalore, or other Indian cities
      if (!jobData.location.match(/Bengaluru|Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|India/i)) {
        logger.info(`Skipping non-India job: ${jobData.title} (Location: ${jobData.location})`);
        return null;
      }

      // Create Job instance
      const job = new Job({
        id: `soundhound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: jobData.title,
        department: jobData.department,
        location: jobData.location,
        workType: jobData.workType,
        experienceLevel: this.extractExperienceLevel(jobData.title),
        description: jobData.description,
        url: jobData.url,
        applyUrl: jobData.applyUrl,
        company: 'SoundHound'
      });

      logger.success(`Scraped: ${job.title}`);
      return job;

    } catch (error) {
      logger.error(`Failed to scrape job details from ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract experience level from job title
   */
  extractExperienceLevel(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('senior') || titleLower.includes('sr.')) return 'Senior';
    if (titleLower.includes('lead') || titleLower.includes('principal')) return 'Lead';
    if (titleLower.includes('staff')) return 'Staff';
    if (titleLower.includes('junior') || titleLower.includes('jr.')) return 'Junior';
    if (titleLower.includes('intern')) return 'Intern';
    return 'Mid-Level';
  }

  /**
   * Auto-scroll to load all jobs
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    // Wait a bit for any lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

export default SoundHoundScraper;

// Made with Bob