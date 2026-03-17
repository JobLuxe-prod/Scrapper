export class Job {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.company = data.company || data.department || '';
    this.department = data.department || '';
    this.location = data.location || '';
    this.workType = data.workType || '';
    this.experienceLevel = data.experienceLevel || '';
    this.description = data.description || '';
    this.url = data.url || '';
    this.applyUrl = data.applyUrl || '';
    this.scrapedAt = data.scrapedAt || new Date().toISOString();
  }

  /**
   * Validate job data
   */
  isValid() {
    return !!(this.title && this.url);
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      company: this.company,
      department: this.department,
      location: this.location,
      workType: this.workType,
      experienceLevel: this.experienceLevel,
      description: this.description,
      url: this.url,
      applyUrl: this.applyUrl,
      scrapedAt: this.scrapedAt
    };
  }

  /**
   * Convert to CSV row
   */
  toCSV() {
    const escape = (str) => {
      if (!str) return '';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    return [
      escape(this.id),
      escape(this.title),
      escape(this.company),
      escape(this.department),
      escape(this.location),
      escape(this.workType),
      escape(this.experienceLevel),
      escape(this.description),
      escape(this.url),
      escape(this.applyUrl),
      escape(this.scrapedAt)
    ].join(',');
  }

  /**
   * Get CSV header
   */
  static getCSVHeader() {
    return 'ID,Title,Company,Department,Location,Work Type,Experience Level,Description,URL,Apply URL,Scraped At';
  }
}

export default Job;

// Made with Bob
