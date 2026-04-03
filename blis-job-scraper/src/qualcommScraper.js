import puppeteer from 'puppeteer';
import { Job } from './models/Job.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class QualcommScraper {
  constructor() {
    this.baseUrl = 'https://careers.qualcomm.com/careers?domain=qualcomm.com&triggerGoButton=true&location=india&start=0';
    this.browser = null;
    this.page = null;
    this.jobs = [];
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    logger.info('Launching browser for Qualcomm...');
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
   * Navigate to Qualcomm jobs page
   */
  async navigateToJobsPage() {
    logger.info(`Navigating to ${this.baseUrl}...`);
    
    await this.page.goto(this.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: config.scraping.timeout
    });

    await delay(3000);

    // Accept cookies if present
    try {
      const cookieAccepted = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptButton = buttons.find(btn => {
          const text = btn.textContent.toLowerCase();
          return text.includes('accept') || text.includes('agree') || text.includes('continue');
        });
        
        if (acceptButton) {
          acceptButton.click();
          return true;
        }
        return false;
      });
      
      if (cookieAccepted) {
        logger.info('Accepted cookies');
        await delay(2000);
      }
    } catch (error) {
      logger.debug('No cookie banner found');
    }

    logger.success('Navigated to Qualcomm jobs page');
  }

  /**
   * Auto-scroll to load all jobs
   */
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    
    await delay(2000);
  }

  /**
   * Click "Show More" button if present to load more jobs
   */
  async loadMoreJobs() {
    let clickedShowMore = false;
    let attempts = 0;
    const maxAttempts = 10; // Load up to 10 pages

    while (attempts < maxAttempts) {
      try {
        // Look for "Show More" or "Load More" button
        const showMoreClicked = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const showMoreBtn = buttons.find(btn => {
            const text = btn.textContent.toLowerCase();
            return text.includes('show more') || 
                   text.includes('load more') || 
                   text.includes('view more') ||
                   text.includes('see more');
          });
          
          if (showMoreBtn && !showMoreBtn.disabled) {
            showMoreBtn.click();
            return true;
          }
          return false;
        });

        if (showMoreClicked) {
          logger.info(`Loading more jobs (attempt ${attempts + 1})...`);
          await delay(3000);
          await this.autoScroll();
          clickedShowMore = true;
          attempts++;
        } else {
          break;
        }
      } catch (error) {
        logger.debug('No more "Show More" button found');
        break;
      }
    }

    if (clickedShowMore) {
      logger.success(`Loaded additional job pages (${attempts} clicks)`);
    }
  }

  /**
   * Extract job listings from the page
   */
  async extractJobListings() {
    logger.section('Extracting Qualcomm Job Listings');

    // Scroll to load all jobs
    await this.autoScroll();
    
    // Try to load more jobs
    await this.loadMoreJobs();

    // Extract job links and basic info
    const jobElements = await this.page.evaluate(() => {
      const jobs = [];
      
      // Try multiple selectors for job cards
      const selectors = [
        'a[href*="/job/"]',
        'a[href*="/careers/"]',
        '[class*="job-card"] a',
        '[class*="JobCard"] a',
        '[class*="job-result"] a',
        '[data-job-id]',
        'article a',
        '.job-link',
        '.job-title a'
      ];
      
      let jobLinks = [];
      for (const selector of selectors) {
        jobLinks = Array.from(document.querySelectorAll(selector));
        if (jobLinks.length > 0) break;
      }
      
      jobLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        
        // Get job title
        let title = '';
        const titleEl = link.querySelector('h1, h2, h3, h4, [class*="title"], [class*="job-title"]');
        if (titleEl) {
          title = titleEl.textContent.trim();
        } else {
          title = link.textContent.trim().split('\n')[0].trim();
        }
        
        // Get location
        let location = '';
        const locEl = link.querySelector('[class*="location"]') || 
                     link.closest('[class*="job"]')?.querySelector('[class*="location"]');
        if (locEl) {
          location = locEl.textContent.trim();
        }
        
        // Get department/category
        let department = '';
        const deptEl = link.querySelector('[class*="department"], [class*="category"]') ||
                      link.closest('[class*="job"]')?.querySelector('[class*="department"], [class*="category"]');
        if (deptEl) {
          department = deptEl.textContent.trim();
        }
        
        const fullUrl = href.startsWith('http') ? href : `https://careers.qualcomm.com${href}`;
        
        // Only add if we have a title and it's not a duplicate
        if (title && title.length > 3 && !jobs.find(j => j.url === fullUrl)) {
          jobs.push({
            url: fullUrl,
            title: title,
            location: location || 'India',
            department: department
          });
        }
      });
      
      return jobs;
    });

    logger.info(`Found ${jobElements.length} Qualcomm job listings`);
    return jobElements;
  }

  /**
   * Scrape detailed information for each job
   */
  async scrapeJobDetails(jobData) {
    logger.info(`Scraping details for: ${jobData.title}`);

    try {
      await this.page.goto(jobData.url, {
        waitUntil: 'networkidle2',
        timeout: config.scraping.timeout
      });

      await delay(2000);

      // Extract job details
      const jobDetails = await this.page.evaluate(() => {
        // Extract location
        let location = '';
        const locSelectors = [
          '[class*="location"]',
          '[data-automation*="location"]',
          '[class*="Location"]',
          '[id*="location"]'
        ];
        
        for (const selector of locSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            location = el.textContent.trim();
            break;
          }
        }
        
        // Fallback: search all text for location
        if (!location) {
          const allText = document.body.textContent;
          const locationMatch = allText.match(/(Bangalore|Bengaluru|Mumbai|Delhi|Hyderabad|Chennai|Pune|India)/i);
          if (locationMatch) {
            location = locationMatch[0];
          }
        }
        
        // Extract department
        let department = '';
        const deptEl = document.querySelector('[class*="department"], [class*="category"], [class*="team"]');
        if (deptEl) {
          department = deptEl.textContent.trim();
        }
        
        // Extract work type
        let workType = 'Hybrid';
        const text = document.body.textContent;
        if (text.includes('Remote')) workType = 'Remote';
        else if (text.includes('On-site') || text.includes('Onsite')) workType = 'On-site';
        
        // Extract description - formatted with bullet points
        let description = '';
        let descriptionParts = [];
        
        // Strategy 1: Look for specific job description containers
        const descSelectors = [
          '[class*="job-description"]',
          '[class*="JobDescription"]',
          '[data-automation*="description"]',
          '[class*="description"]',
          '[id*="description"]',
          '[class*="job-details"]'
        ];
        
        for (const selector of descSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.length > 100) {
            // Extract structured content with bullet points
            const headers = el.querySelectorAll('h1, h2, h3, h4, h5, strong, b');
            const lists = el.querySelectorAll('ul, ol');
            const paragraphs = el.querySelectorAll('p');
            
            // Process headers
            headers.forEach(header => {
              const headerText = header.textContent.trim();
              if (headerText.length > 3 && !headerText.match(/^(Apply|Back|Share|Save)/i)) {
                descriptionParts.push(`\n${headerText}:`);
              }
            });
            
            // Process lists as bullet points
            lists.forEach(list => {
              const items = list.querySelectorAll('li');
              items.forEach(item => {
                const text = item.textContent.trim();
                if (text.length > 10) {
                  descriptionParts.push(`• ${text}`);
                }
              });
            });
            
            // Process paragraphs
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text.length > 20 && !text.match(/^(Apply|Back|Share|Save)/i)) {
                descriptionParts.push(`\n${text}`);
              }
            });
            
            if (descriptionParts.length > 0) {
              description = descriptionParts.join('\n');
              break;
            }
          }
        }
        
        // Strategy 2: Extract from main content with bullet formatting
        if (!description || description.length < 100) {
          const mainContent = document.querySelector('main') || document.querySelector('article') || document.querySelector('[role="main"]');
          if (mainContent) {
            const seenText = new Set();
            
            // Extract headers
            const headers = mainContent.querySelectorAll('h2, h3, h4, h5');
            headers.forEach(h => {
              const text = h.textContent.trim();
              if (text.length > 3 && !text.match(/^(Apply|Back|Share|Save|Home|Jobs|Career|Search)/i) && !seenText.has(text)) {
                seenText.add(text);
                descriptionParts.push(`\n${text}:`);
              }
            });
            
            // Extract list items as bullets
            const listItems = mainContent.querySelectorAll('li');
            listItems.forEach(li => {
              const text = li.textContent.trim();
              if (text.length > 10 && !seenText.has(text)) {
                seenText.add(text);
                descriptionParts.push(`• ${text}`);
              }
            });
            
            // Extract paragraphs
            const paragraphs = mainContent.querySelectorAll('p');
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text.length > 20 && !text.match(/^(Apply|Back|Share|Save)/i) && !seenText.has(text)) {
                seenText.add(text);
                descriptionParts.push(`\n${text}`);
              }
            });
            
            description = descriptionParts.join('\n');
          }
        }
        
        // Strategy 3: Fallback with bullet point formatting
        if (!description || description.length < 50) {
          const bodyText = document.body.textContent;
          const sections = bodyText.split(/(?:Responsibilities|Requirements|Qualifications|About the role|Job Description)/i);
          
          if (sections.length > 1) {
            const content = sections[1].substring(0, 2000);
            const lines = content.split(/[•\n]/).filter(line => line.trim().length > 20);
            description = lines.map(line => `• ${line.trim()}`).join('\n');
          } else {
            description = bodyText.substring(0, 2000);
          }
        }
        
        // Clean up and limit length
        description = description
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\s{2,}/g, ' ')
          .trim();
          
        if (description.length > 5000) {
          description = description.substring(0, 5000) + '...';
        }
        
        return { location, department, workType, description };
      });

      // Extract apply URL
      const applyUrl = await this.page.evaluate(() => {
        // Look for apply button/link
        const selectors = [
          'a[href*="apply"]',
          'button[class*="apply"]',
          'a[class*="apply"]',
          '[data-automation*="apply"]',
          'a[href*="application"]'
        ];
        
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            const href = el.getAttribute('href');
            if (href && href.trim() !== '' && href !== '#') {
              return href;
            }
            
            // Check data attributes
            const dataUrl = el.getAttribute('data-url') || 
                           el.getAttribute('data-href');
            if (dataUrl) return dataUrl;
          }
        }
        
        // Fallback to current page
        return window.location.href;
      });

      // Construct final apply URL
      let finalApplyUrl = applyUrl;
      if (!applyUrl.startsWith('http')) {
        if (applyUrl.startsWith('/')) {
          finalApplyUrl = `https://careers.qualcomm.com${applyUrl}`;
        } else {
          finalApplyUrl = `https://careers.qualcomm.com/${applyUrl}`;
        }
      }

      // Extract experience level from title and description
      const experienceLevel = this.extractExperienceLevel(
        jobData.title, 
        jobDetails.description
      );

      // Create Job object
      const job = new Job({
        id: jobData.url.split('/').pop() || `qualcomm-${Date.now()}`,
        title: jobData.title,
        company: 'Qualcomm',
        department: jobDetails.department || jobData.department,
        location: jobDetails.location || jobData.location,
        workType: jobDetails.workType,
        experienceLevel: experienceLevel,
        description: jobDetails.description.substring(0, 5000),
        url: jobData.url,
        applyUrl: finalApplyUrl
      });

      if (job.isValid()) {
        this.jobs.push(job);
        logger.success(`✓ Scraped: ${job.title}`);
      }

    } catch (error) {
      logger.error(`Failed to scrape ${jobData.title}: ${error.message}`);
    }
  }

  /**
   * Extract experience level from title and description
   */
  extractExperienceLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.match(/\b(staff|principal|architect|director)\b/)) return 'Staff';
    if (text.match(/\b(senior|sr\.?|lead)\b/)) return 'Senior';
    if (text.match(/\b(mid|intermediate|ii|2)\b/)) return 'Mid Level';
    if (text.match(/\b(junior|jr\.?|entry|associate|i|1)\b/)) return 'Junior';
    if (text.match(/\b(intern|internship|fresher|graduate)\b/)) return 'Fresher';
    
    return 'Mid Level';
  }

  /**
   * Main scraping method
   */
  async scrape() {
    try {
      await this.initialize();
      await this.navigateToJobsPage();
      
      const jobListings = await this.extractJobListings();
      
      if (jobListings.length === 0) {
        logger.warn('No Qualcomm jobs found');
        await this.close();
        return [];
      }

      logger.section(`Scraping ${jobListings.length} Qualcomm Job Details`);
      
      for (let i = 0; i < jobListings.length; i++) {
        logger.info(`[${i + 1}/${jobListings.length}] Processing job...`);
        await this.scrapeJobDetails(jobListings[i]);
        await delay(1000); // Be respectful to the server
      }

      await this.close();
      
      logger.section('Qualcomm Scraping Complete');
      logger.success(`Successfully scraped ${this.jobs.length} Qualcomm jobs`);
      
      return this.jobs;

    } catch (error) {
      logger.error('Qualcomm scraping failed', error);
      await this.close();
      return [];
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
}

// Made with Bob