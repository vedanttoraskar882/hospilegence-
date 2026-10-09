/**
 * Hospilegence — Frontend Application Script
 * Strictly frontend-only; operates entirely in browser with zero server/API dependencies.
 * Uses localStorage key 'passledgerAI_pilotSubmissions' per exact specification.
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // CONSTANTS & STATE
  // =========================================================================
  const STORAGE_KEY = 'passledgerAI_pilotSubmissions';
  let lastFocusedTrigger = null;
  let isSubmitting = false;

  // =========================================================================
  // DOM ELEMENT REFERENCES
  // =========================================================================
  const siteHeader = document.getElementById('siteHeader');
  const scrollProgressBar = document.getElementById('scrollProgressBar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  const sections = document.querySelectorAll('section[id], header[id]');

  const modalOverlay = document.getElementById('pilotModalOverlay');
  const modalContainer = document.getElementById('pilotModalContainer');
  const closeModalBtn = document.getElementById('closePilotModalBtn');
  const openModalButtons = document.querySelectorAll('.open-pilot-modal');

  const pilotForm = document.getElementById('pilotForm');
  const fullNameInput = document.getElementById('fullName');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const emailAddressInput = document.getElementById('emailAddress');
  const organisationNameInput = document.getElementById('organisationName');
  const submitBtn = document.getElementById('pilotSubmitBtn');

  const modalAlertBox = document.getElementById('modalAlertBox');
  const storageCountElem = document.getElementById('storageSubmissionsCount');
  const toggleStoredListBtn = document.getElementById('toggleStoredListBtn');
  const storedRecordsDrawer = document.getElementById('storedRecordsDrawer');
  const storedRecordsList = document.getElementById('storedRecordsList');

  // =========================================================================
  // SCROLL PROGRESS BAR & STICKY HEADER COMPACTION
  // =========================================================================
  function handleWindowScroll() {
    const scrollY = window.scrollY;
    
    // Compact Header on scroll
    if (siteHeader) {
      if (scrollY > 30) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }

    // Scroll Progress Indicator
    if (scrollProgressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      scrollProgressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }

  window.addEventListener('scroll', handleWindowScroll, { passive: true });
  handleWindowScroll(); // initial check

  // =========================================================================
  // SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
  // =========================================================================
  const animatedElements = document.querySelectorAll('[data-animate="fade-up"]');
  
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay');
          if (delay) {
            setTimeout(() => {
              entry.target.classList.add('is-revealed');
            }, parseInt(delay, 10));
          } else {
            entry.target.classList.add('is-revealed');
          }
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    });

    animatedElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback for older environments
    animatedElements.forEach(el => el.classList.add('is-revealed'));
  }

  // =========================================================================
  // INTERACTIVE DAILY DECISION BRIEF OPTION SELECTOR
  // =========================================================================
  const optionCards = document.querySelectorAll('.brief-options-section .option-card');
  optionCards.forEach(card => {
    card.addEventListener('click', () => {
      optionCards.forEach(c => c.classList.remove('option-featured'));
      card.classList.add('option-featured');
    });
  });

  // =========================================================================
  // MOBILE NAVIGATION DRAWER
  // =========================================================================
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      mobileMenuBtn.setAttribute('aria-expanded', String(newState));
      mobileNav.setAttribute('aria-hidden', String(!newState));
      mobileNav.classList.toggle('open', newState);
    });

    // Close mobile nav on clicking any nav link
    const mobileLinks = mobileNav.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
        mobileNav.classList.remove('open');
      });
    });
  }

  // =========================================================================
  // ACTIVE NAVIGATION OBSERVER
  // =========================================================================
  const navObserverOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, navObserverOptions);

  sections.forEach(section => {
    navObserver.observe(section);
  });

  // =========================================================================
  // FAQ ACCORDION (ACCESSIBLE DISCLOSURE PATTERN)
  // =========================================================================
  const faqButtons = document.querySelectorAll('.faq-question-btn');
  faqButtons.forEach(button => {
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const panelId = button.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);

      // Close other panels for clean single accordion disclosure
      faqButtons.forEach(otherBtn => {
        if (otherBtn !== button) {
          otherBtn.setAttribute('aria-expanded', 'false');
          const otherPanelId = otherBtn.getAttribute('aria-controls');
          const otherPanel = document.getElementById(otherPanelId);
          if (otherPanel) {
            otherPanel.hidden = true;
          }
        }
      });

      // Toggle current panel
      button.setAttribute('aria-expanded', String(!isExpanded));
      if (panel) {
        panel.hidden = isExpanded;
      }
    });
  });

  // =========================================================================
  // MODAL ACCESSIBILITY & FOCUS MANAGEMENT
  // =========================================================================
  function openModal(triggerElement) {
    lastFocusedTrigger = triggerElement || document.activeElement;
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Clear previous alerts and errors
    clearFormErrors();
    hideModalAlert();
    updateStorageCountDisplay();

    // Set focus to the first interactive field in modal
    setTimeout(() => {
      if (fullNameInput) {
        fullNameInput.focus();
      }
    }, 50);
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Return focus to trigger button
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }
  }

  // Open modal button triggers
  openModalButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      // If mobile menu open, close it
      if (mobileNav && mobileNav.classList.contains('open')) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
        mobileNav.classList.remove('open');
      }
      openModal(button);
    });
  });

  // Close modal button trigger
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Close when clicking backdrop outside modal container
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Keyboard accessibility: Escape to close & Focus trapping inside modal
  document.addEventListener('keydown', (e) => {
    if (modalOverlay.classList.contains('active')) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeModal();
        return;
      }

      // Trap Tab Focus
      if (e.key === 'Tab') {
        const focusableElements = modalContainer.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    }
  });

  // =========================================================================
  // FORM VALIDATION UTILITIES
  // =========================================================================
  function clearFormErrors() {
    ['fullName', 'phoneNumber', 'emailAddress', 'organisationName'].forEach(id => {
      const input = document.getElementById(id);
      const errSpan = document.getElementById(`${id}Error`);
      if (input) input.classList.remove('input-error');
      if (errSpan) errSpan.textContent = '';
    });
  }

  function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errSpan = document.getElementById(`${inputId}Error`);
    if (input) input.classList.add('input-error');
    if (errSpan) errSpan.textContent = message;
  }

  function validateEmail(email) {
    // RFC 5322 compatible practical regex
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailPattern.test(email);
  }

  function validatePhone(phone) {
    // Practical international phone pattern: optional +, allows spaces, hyphens, brackets, minimum 7 to 16 digits
    const digitsOnly = phone.replace(/\D/g, '');
    const phonePattern = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{5,15}$/;
    return phonePattern.test(phone) && digitsOnly.length >= 7 && digitsOnly.length <= 16;
  }

  function showModalAlert(message, type) {
    if (!modalAlertBox) return;
    modalAlertBox.className = `alert-box alert-${type}`;
    modalAlertBox.textContent = message;
    modalAlertBox.hidden = false;
  }

  function hideModalAlert() {
    if (!modalAlertBox) return;
    modalAlertBox.hidden = true;
    modalAlertBox.textContent = '';
  }

  // =========================================================================
  // LOCALSTORAGE MANAGEMENT & FORM SUBMISSION
  // =========================================================================
  function getStoredSubmissions() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw === null ? [] : JSON.parse(raw);

    if (
      !Array.isArray(existing) ||
      existing.some(item =>
        item === null ||
        typeof item !== 'object' ||
        Array.isArray(item)
      )
    ) {
      throw new Error(
        "Stored submissions are invalid. Existing data has been preserved."
      );
    }
    return existing;
  }

  function updateStorageCountDisplay() {
    try {
      const records = getStoredSubmissions();
      const count = records.length;
      if (storageCountElem) {
        storageCountElem.textContent = `${count} saved submission${count === 1 ? '' : 's'} in this browser`;
      }
      renderStoredList(records);
    } catch (err) {
      if (storageCountElem) {
        storageCountElem.textContent = `Storage integrity warning: existing data preserved`;
      }
    }
  }

  function renderStoredList(records) {
    if (!storedRecordsList) return;
    if (!records || records.length === 0) {
      storedRecordsList.innerHTML = `<p class="record-details" style="text-align: center; padding: 12px 0;">No pilot submissions saved in browser yet.</p>`;
      return;
    }

    // Display records (newest first)
    const reversed = [...records].reverse();
    storedRecordsList.innerHTML = reversed.map((rec) => {
      const dateStr = rec.submissionDateTime ? new Date(rec.submissionDateTime).toLocaleString() : 'Date unavailable';
      const safeName = escapeHtml(rec.fullName || 'Anonymous');
      const safeOrg = escapeHtml(rec.organisationName || 'Unknown Org');
      const safeEmail = escapeHtml(rec.emailAddress || 'No email');
      const safePhone = escapeHtml(rec.phoneNumber || 'No phone');

      return `
        <div class="stored-record-entry">
          <div class="record-row">
            <span class="record-name">${safeName}</span>
            <span class="record-org">${safeOrg}</span>
          </div>
          <div class="record-row">
            <span class="record-details">${safeEmail} · ${safePhone}</span>
            <span class="record-time">${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Toggle stored records drawer
  if (toggleStoredListBtn && storedRecordsDrawer) {
    toggleStoredListBtn.addEventListener('click', () => {
      const isHidden = storedRecordsDrawer.hidden;
      storedRecordsDrawer.hidden = !isHidden;
      toggleStoredListBtn.textContent = isHidden ? 'Hide Stored Records' : 'View Stored Records';
    });
  }

  // Handle Form Submit
  if (pilotForm) {
    pilotForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (isSubmitting) return;

      clearFormErrors();
      hideModalAlert();

      // Retrieve and trim values
      const fullName = (fullNameInput.value || '').trim();
      const phoneNumber = (phoneNumberInput.value || '').trim();
      const emailAddress = (emailAddressInput.value || '').trim();
      const organisationName = (organisationNameInput.value || '').trim();

      let hasError = false;

      // Full Name Validation
      if (!fullName) {
        showFieldError('fullName', 'Full Name is required.');
        hasError = true;
      } else if (fullName.length < 2) {
        showFieldError('fullName', 'Please enter a valid full name.');
        hasError = true;
      }

      // Phone Number Validation
      if (!phoneNumber) {
        showFieldError('phoneNumber', 'Phone Number is required.');
        hasError = true;
      } else if (!validatePhone(phoneNumber)) {
        showFieldError('phoneNumber', 'Please enter a valid phone number (e.g. +44 7700 900077).');
        hasError = true;
      }

      // Email Address Validation
      if (!emailAddress) {
        showFieldError('emailAddress', 'Email Address is required.');
        hasError = true;
      } else if (!validateEmail(emailAddress)) {
        showFieldError('emailAddress', 'Please enter a valid email address.');
        hasError = true;
      }

      // Organisation Name Validation
      if (!organisationName) {
        showFieldError('organisationName', 'Organisation Name is required.');
        hasError = true;
      } else if (organisationName.length < 2) {
        showFieldError('organisationName', 'Please enter your restaurant, pub, or group name.');
        hasError = true;
      }

      if (hasError) {
        showModalAlert('Please correct the highlighted fields above.', 'error');
        return;
      }

      // Create new submission record with automatic ISO timestamp
      const newSubmission = {
        id: 'pilot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        fullName: fullName,
        phoneNumber: phoneNumber,
        emailAddress: emailAddress,
        organisationName: organisationName,
        submissionDateTime: new Date().toISOString()
      };

      isSubmitting = true;
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Implementation pattern per strict specifications
        const raw = localStorage.getItem(STORAGE_KEY);
        const existing = raw === null ? [] : JSON.parse(raw);

        if (
          !Array.isArray(existing) ||
          existing.some(item =>
            item === null ||
            typeof item !== "object" ||
            Array.isArray(item)
          )
        ) {
          throw new Error(
            "Stored submissions are invalid. Existing data has been preserved."
          );
        }

        existing.push(newSubmission);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(existing)
        );

        // Success: Only show success after the write succeeds!
        showModalAlert(
          "Your pilot interest has been saved in this browser. No message has been sent.",
          "success"
        );

        // Reset inputs ONLY after a successful save
        pilotForm.reset();

        // Update count and drawer
        updateStorageCountDisplay();

      } catch (err) {
        // If JSON is malformed, storage blocked or quota exceeded:
        console.error("Storage error:", err);
        showModalAlert(
          `Unable to save to browser storage: ${err.message || 'Storage blocked or full'}. Your entered details have been preserved.`,
          "error"
        );
      } finally {
        isSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Initial update of storage display on page load
  updateStorageCountDisplay();
});
