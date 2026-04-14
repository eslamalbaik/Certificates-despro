const API_ENDPOINTS = {
  TEMPLATE_ANALYSIS: '/api/certificates/analyze-template',
  GENERATE_FIXED: '/api/certificates/generate-fixed',
  GENERATE_CERTIFICATE: '/api/certificates/generate-certificate',
  BATCH_GENERATE: '/api/certificates/batch-generate',
  VALIDATE_TEMPLATE: '/api/validate-template',
  JOB_EVENTS: (jobId) => `/api/jobs/${jobId}/events`,
};

class CertificateAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || '';
  }

  async uploadTemplate(formData) {
    try {
      const response = await fetch(this.url(API_ENDPOINTS.TEMPLATE_ANALYSIS), {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'فشل تحليل القالب');
    }
  }

  async validateTemplate(templateId) {
    try {
      const response = await fetch(this.url(API_ENDPOINTS.VALIDATE_TEMPLATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ templateId }),
        credentials: 'include',
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'فشل التحقق من القالب');
    }
  }

  async generateCertificate(payload) {
    try {
      const response = await fetch(this.url(API_ENDPOINTS.GENERATE_CERTIFICATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await this.handleResponse(response);
      return this.normalizeGenerateResponse(data);
    } catch (error) {
      throw this.handleError(error, 'فشل إنشاء الشهادة');
    }
  }

  async generateFixed(payload) {
    // payload expects keys per backend contract: traineeName, courseName, trainerName, certificateNumber?, issueDate?
    try {
      const response = await fetch(this.url(API_ENDPOINTS.GENERATE_FIXED), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await this.handleResponse(response);
      return this.normalizeGenerateFixedResponse(data);
    } catch (error) {
      throw this.handleError(error, 'فشل إنشاء الشهادة');
    }
  }

  async batchGenerate(payload) {
    try {
      const response = await fetch(this.url(API_ENDPOINTS.BATCH_GENERATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'فشل إنشاء الشهادات دفعة واحدة');
    }
  }

  subscribeToJob(jobId, onMessage, onError) {
    const url = this.url(API_ENDPOINTS.JOB_EVENTS(jobId));
    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = (evt) => {
      try { onMessage && onMessage(JSON.parse(evt.data)); } catch (_) { /* ignore */ }
    };
    es.onerror = (err) => { onError && onError(err); es.close(); };
    return () => es.close();
  }

  // Helpers
  url(path) { return `${this.baseUrl}${path}`; }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      const message = (payload && (payload.message || payload.error)) || response.statusText || 'Request failed';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  handleError(error, fallback) {
    if (error?.status) return error; // already normalized
    const e = new Error(error?.message || fallback || 'Network error');
    e.cause = error;
    return e;
  }

  normalizeGenerateResponse(data) {
    return {
      success: data.message ? true : (data.success ?? true),
      certificateNumber: data.issued?.certificateNumber || data.certificateNumber,
      issueDate: data.issued?.createdAt || data.issueDate,
      pdfUrl: data.issued?.pdfUrl || data.pdfUrl || data.certificateUrl,
      verifyUrl: data.issued?.verificationUrl || data.verifyUrl || data.verificationUrl || (data.issued?.certificateNumber || data.certificateNumber ? `https://desn.pro/verify?certificate=${data.issued?.certificateNumber || data.certificateNumber}` : undefined),
      jobId: data.jobId,
    };
  }

  normalizeGenerateFixedResponse(data) {
    return {
      success: data.message ? true : (data.success ?? true),
      certificateNumber: data.certificateNumber,
      issueDate: data.issueDate,
      pdfUrl: data.pdfUrl || data.certificateUrl,
      verifyUrl: data.verificationUrl || data.verifyUrl || (data.certificateNumber ? `https://desn.pro/verify?certificate=${data.certificateNumber}` : undefined),
    };
  }
}

export { API_ENDPOINTS, CertificateAPI };


