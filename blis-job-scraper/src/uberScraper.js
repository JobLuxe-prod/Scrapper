import puppeteer from 'puppeteer';
import { config } from './config.js';
import { Job } from './models/Job.js';
import { logger } from './utils/logger.js';

/**
 * Helper function to wait/delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class UberScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.jobs = [];
    this.baseUrl = 'https://www.uber.com/in/en/careers/list/?location=IND-Karn%C4%81taka-Bangalore';
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    logger.info('Launching browser for Uber...');
    this.browser = await puppeteer.launch({
      headless: config.scraping.headless,
      args: config.browser.args,
      defaultViewport: config.browser.defaultViewport
    });

    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    logger.success('Browser launched successfully');
  }

  /**
   * Navigate to Uber jobs page
   */
  async navigateToJobsPage() {
    logger.info(`Navigating to ${this.baseUrl}...`);
    
    await this.page.goto(this.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: config.scraping.timeout
    });

    await delay(3000);
    logger.success('Navigated to Uber jobs page');
  }

  /**
   * Extract job listings from the main page
   */
  async extractJobListings() {
    logger.section('Extracting Uber Job Listings');

    // Scroll to load all jobs
    await this.autoScroll();

    // Extract job links and basic info
    const jobElements = await this.page.evaluate(() => {
      const jobs = [];
      
      // Find all job listing rows - they are typically in a table or list structure
      const allLinks = Array.from(document.querySelectorAll('a'));
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Filter for job detail links
        if (!href || !href.includes('/careers/list/') || href === '/careers/list/') return;
        
        // Get the parent container that has all job info
        let container = link;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
          if (!container) break;
        }
        
        if (!container) return;
        
        const text = container.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        // Extract title (usually the first line or in the link)
        let title = link.innerText.trim();
        if (!title && lines.length > 0) {
          title = lines[0];
        }
        
        // Extract department and location from text
        let department = '';
        let location = '';
        
        // Look for location patterns
        const locationMatch = text.match(/Bangalore,?\s*India/i);
        if (locationMatch) {
          location = 'Bangalore, India';
        }
        
        // Department is usually before location
        lines.forEach(line => {
          if (line.toLowerCase().includes('backend') ||
              line.toLowerCase().includes('frontend') ||
              line.toLowerCase().includes('engineering') ||
              line.toLowerCase().includes('operations') ||
              line.toLowerCase().includes('machine learning') ||
              line.toLowerCase().includes('manager')) {
            department = line;
          }
        });
        
        if (title && href && location) {
          jobs.push({
            url: href.startsWith('http') ? href : `https://www.uber.com${href}`,
            title: title,
            department: department,
            location: location
          });
        }
      });
      
      // Remove duplicates
      const uniqueJobs = [];
      const seen = new Set();
      jobs.forEach(job => {
        if (!seen.has(job.url)) {
          seen.add(job.url);
          uniqueJobs.push(job);
        }
      });
      
      return uniqueJobs;
    });

    // Filter for Bangalore jobs only
    const bangaloreJobs = jobElements.filter(job => 
      job.location && job.location.toLowerCase().includes('bangalore')
    );

    logger.info(`Found ${bangaloreJobs.length} Uber jobs in Bangalore`);
    return bangaloreJobs;
  }

  /**
   * Scrape detailed information for each job
   */
  async scrapeJobDetails(jobData) {
    logger.info(`Scraping Uber job: ${jobData.title}`);

    try {
      await this.page.goto(jobData.url, {
        waitUntil: 'networkidle2',
        timeout: config.scraping.timeout
      });

      await delay(2000);

      // Extract job description
      const jobDetails = await this.page.evaluate(() => {
        // Extract description - improved with better filtering
        let description = '';
        
        // Strategy 1: Look for specific job description containers
        const descSelectors = [
          'div[class*="job-description"]',
          'div[class*="JobDescription"]',
          'div[class*="description"]',
          '[data-testid*="description"]',
          'div[class*="Role"]'
        ];

        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element && element.innerText.length > 100) {
            description = element.innerText.trim();
            break;
          }
        }
        
        // Strategy 2: Extract from main content with aggressive filtering
        if (!description || description.length < 100) {
          const mainContent = document.querySelector('main') || document.querySelector('article');
          if (mainContent) {
            const contentElements = mainContent.querySelectorAll('p, li, h3, h4');
            const seenText = new Set();
            const textParts = [];
            
            // Navigation/menu keywords to filter out
            const navKeywords = /^(Teams|Departments|Locations|Inside Uber|Products|Home|Ride|Drive|Eat|Merchants|Freight|Transit|Bike|Business|Money|Blog|Benefits|Apply|Back|Share|Save|Jobs|Career|options available|Asia Pacific|Europe|Latin America|United States|Canada)/i;
            
            contentElements.forEach(el => {
              const text = el.textContent.trim();
              // More aggressive filtering
              if (text.length > 30 &&
                  !navKeywords.test(text) &&
                  !seenText.has(text) &&
                  !text.includes('options available')) {
                seenText.add(text);
                textParts.push(text);
              }
            });
            
            description = textParts.join('\n\n');
          }
        }
        
        // Strategy 3: Extract specific sections using regex
        if (!description || description.length < 100) {
          const bodyText = document.body.innerText;
          // Look for job description sections
          const patterns = [
            /(?:About the Role|What the Candidate Will Do)([\s\S]+?)(?:Basic Qualifications|Preferred Qualifications|Apply|$)/i,
            /(?:Basic Qualifications)([\s\S]+?)(?:Preferred Qualifications|Apply|$)/i,
            /(?:What You'll Do)([\s\S]+?)(?:What We're Looking For|Requirements|Apply|$)/i
          ];
          
          for (const pattern of patterns) {
            const match = bodyText.match(pattern);
            if (match && match[1] && match[1].length > 100) {
              description += match[1].trim() + '\n\n';
            }
          }
        }
        
        // Clean up the description
        description = description
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\s{2,}/g, ' ')
          .replace(/^[\s\-]+/gm, '') // Remove leading dashes and spaces
          .trim();

        return { description };
      });

      // Extract experience level
      const experienceLevel = this.extractExperienceLevel(jobData.title, jobDetails.description);

      // Create Job object
      const job = new Job({
        id: `uber-${jobData.url.split('/').pop()}`,
        title: jobData.title,
        company: 'Uber',
        department: jobData.department,
        location: jobData.location,
        workType: 'Hybrid', // Uber typically offers hybrid
        experienceLevel: experienceLevel,
        description: jobDetails.description.substring(0, 5000),
        url: jobData.url,
        applyUrl: jobData.url
      });

      if (job.isValid()) {
        this.jobs.push(job);
        logger.success(`✓ Scraped: ${job.title}`);
      }

    } catch (error) {
      logger.error(`Failed to scrape ${jobData.title}: ${error.message}`);
    }

    // Go back to listings page
    await this.page.goto(this.baseUrl, {
      waitUntil: 'networkidle2'
    });
    await delay(1000);
  }

  /**
   * Extract experience level from job title and description
   */
  extractExperienceLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('intern') || text.includes('internship')) {
      return 'Internship';
    } else if (text.includes('junior') || text.includes('associate') || text.includes('entry')) {
      return 'Junior/Associate';
    } else if (text.includes('senior') || text.includes('sr.') || text.includes('sr ')) {
      return 'Senior';
    } else if (text.includes('lead') || text.includes('principal') || text.includes('staff')) {
      return 'Lead/Principal';
    } else if (text.includes('manager') || text.includes('head of')) {
      return 'Manager';
    } else if (text.includes('director') || text.includes('vp') || text.includes('vice president')) {
      return 'Director/VP';
    } else if (text.includes('chief') || text.includes('cto') || text.includes('ceo')) {
      return 'Executive';
    }
    
    const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years >= 8) return 'Senior';
      if (years >= 5) return 'Mid-Level';
      if (years >= 2) return 'Junior/Associate';
      return 'Entry Level';
    }
    
    return 'Mid-Level';
  }

  /**
   * Auto-scroll to load all content
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

    await delay(1000);
  }

  /**
   * Run the complete scraping process
   */
  async scrape() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      
      const jobListings = await this.extractJobListings();
      
      if (jobListings.length === 0) {
        logger.warning('No Uber jobs found in Bangalore');
        return this.jobs;
      }
      
      logger.section(`Scraping ${jobListings.length} Uber Job Details`);
      
      // Limit to first 10 jobs to avoid long scraping times
      const jobsToScrape = jobListings.slice(0, 10);
      
      for (let i = 0; i < jobsToScrape.length; i++) {
        logger.info(`[${i + 1}/${jobsToScrape.length}] Processing Uber job...`);
        await this.scrapeJobDetails(jobsToScrape[i]);
      }

      logger.section('Uber Scraping Complete');
      logger.success(`Successfully scraped ${this.jobs.length} Uber jobs`);
      
      return this.jobs;

    } catch (error) {
      logger.error(`Uber scraping failed: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
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
   * Get scraped jobs
   */
  getJobs() {
    return this.jobs;
  }
}

export default UberScraper;

// Made with Bob
