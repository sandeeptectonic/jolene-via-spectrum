class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    sections.forEach((section) => {
      const url2 = `${window.location.pathname}&${searchParams}`;

      const filterDataUrl = (element) => element.url === url;

      // FacetFiltersForm.filterData.some(filterDataUrl)
      //   ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
      //   : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements = parsedHTML.querySelectorAll(
      // '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
      '#FacetFiltersForm '
    );
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter((element) => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(`.js-filter[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    const targetElementAccessibility = target.querySelector('.facets__summary');
    const sourceElementAccessibility = source.querySelector('.facets__summary');

    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }

    if (targetElementAccessibility && sourceElementAccessibility) {
      target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            const noJsElements = document.querySelectorAll('.no-js-list');
            noJsElements.forEach((el) => el.remove());
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }
  on;
  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((element) =>
      element.addEventListener('change', this.onRangeChange.bind(this))
    );
    this.setMinAndMaxValues();
  }

  // onRangeChange(event) {
  //   this.adjustToValidValues(event.currentTarget);
  //   this.setMinAndMaxValues();
  // }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    const facetLinkEnd = this.querySelector('.clear_filter_list');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLinkEnd.addEventListener('click', this.closeFilter2.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    let optionVal = "";
    
    if(event.target.parentNode.attributes[2]?.nodeValue){
      optionVal = event.target.parentNode.attributes[2].nodeValue;
    }else{
      optionVal = event.target.attributes[2].value;
    } 
    if (optionVal == 'button') {
      $('input.field__input.min').val(0);
      $('input.field__input.max').val(newValPrice);
      $('#minPriceinput').val('$' + 0);
      $('#maxPriceinput').val('$' + newValPrice);
      $('.range-selected').css({
        left: '0',
        right: '0',
      });
    } else {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach((checkbox) => {
        const checkboxValue = checkbox.value;
        if (checkboxValue === optionVal) {
          checkbox.checked = false;
        }
      });
    }
     const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
    
    form.onActiveFilterClick(event);
  }

  closeFilter2(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
    $('.mobile-facets__checkbox').prop('checked', false);
    $('input.field__input.min').val(0);
    $('input.field__input.max').val(newValPrice);
    $('#minPriceinput').val('$' + 0);
    $('#maxPriceinput').val('$' + newValPrice);
    $('.range-selected').css({
      left: '0',
      right: '0',
    });
     const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
  }
}

customElements.define('facet-remove', FacetRemove);

/* =============================================
   SPECTRUM TOOLBAR & DRAWER
   ============================================= */

(function () {
  'use strict';

  // --- FILTER BUTTON: Open Spectrum drawer ---
  const filterOpenBtn = document.getElementById('SpectrumFilterOpen');
  if (filterOpenBtn) {
    filterOpenBtn.addEventListener('click', () => {
      const drawer = document.querySelector('.spectrum-drawer');
      if (!drawer) return;
      const details = drawer.querySelector('.mobile-facets__disclosure');
      const summary = details?.querySelector('summary');
      if (!details || !summary) return;

      // Force-clear any inline display:none before opening
      details.style.removeProperty('display');

      // Trigger the MenuDrawer's open via summary click
      summary.click();

      // After MenuDrawer processes, ensure display is not hidden
      requestAnimationFrame(() => {
        details.style.removeProperty('display');
      });
    });
  }

  // --- Helper: close drawer properly via summary click (triggers MenuDrawer.closeMenuDrawer) ---
  function closeSpectrumDrawer(triggerElement) {
    if (!triggerElement) return;
    const details = triggerElement.closest('details');
    const summary = details?.querySelector('summary');
    if (summary && details?.hasAttribute('open')) {
      summary.click();
    }
  }

  // --- DRAWER CLOSE BUTTON ---
  // Intercept before MenuDrawer's onCloseButtonClick to use proper close path
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('.spectrum-drawer__close');
    if (!closeBtn) return;
    e.stopPropagation(); // Prevent MenuDrawer's onCloseButtonClick (uses closeSubmenu, not closeMenuDrawer)
    closeSpectrumDrawer(closeBtn);
  }, true); // Capture phase to fire before MenuDrawer's handler

  // --- DRAWER: Category navigation ---
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.spectrum-drawer__nav-item');
    if (!navItem) return;

    const targetId = navItem.dataset.target;
    const nav = navItem.closest('.spectrum-drawer__nav');
    const body = navItem.closest('.spectrum-drawer__body');
    if (!nav || !body) return;

    nav.querySelectorAll('.spectrum-drawer__nav-item').forEach((btn) => btn.classList.remove('is-active'));
    body.querySelectorAll('.spectrum-drawer__panel').forEach((p) => p.classList.remove('is-active'));

    navItem.classList.add('is-active');
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.add('is-active');
  });

  // --- DRAWER: VIEW RESULTS button ---
  document.addEventListener('click', (e) => {
    const applyBtn = e.target.closest('.spectrum-drawer__apply');
    if (!applyBtn) return;
    e.stopPropagation(); // Prevent MenuDrawer's onCloseButtonClick
    closeSpectrumDrawer(applyBtn);
  }, true); // Capture phase

  // --- DRAWER: RESET button ---
  document.addEventListener('click', (e) => {
    const resetBtn = e.target.closest('.spectrum-drawer__reset');
    if (!resetBtn) return;
    e.preventDefault();

    // Immediately uncheck all checkboxes in the drawer form
    const form = resetBtn.closest('form') || document.getElementById('FacetFiltersFormMobile');
    if (form) {
      form.querySelectorAll('.spectrum-drawer__input:checked').forEach((cb) => {
        cb.checked = false;
      });
      // Clear price range inputs
      form.querySelectorAll('.spectrum-drawer__price-range input[type="number"]').forEach((input) => {
        input.value = '';
      });
    }

    // Trigger AJAX render with no filter params (base URL)
    const resetUrl = resetBtn.href || '';
    const searchParams = resetUrl.indexOf('?') === -1 ? '' : resetUrl.slice(resetUrl.indexOf('?') + 1);
    FacetFiltersForm.toggleActiveFacets();
    FacetFiltersForm.renderPage(searchParams);
  });

  // --- DRAWER: Click outside (on overlay backdrop) to close ---
  document.addEventListener('click', (e) => {
    // Only close if clicking directly on the .mobile-facets overlay (not its children)
    if (e.target.classList.contains('mobile-facets') && e.target.closest('.spectrum-drawer')) {
      closeSpectrumDrawer(e.target);
    }
  });

  // --- SORT DROPDOWN ---
  const sortBtn = document.getElementById('SpectrumSortBtn');
  const sortDropdown = document.getElementById('SpectrumSortDropdown');

  if (sortBtn && sortDropdown) {
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sortDropdown.classList.toggle('is-open');
      sortBtn.setAttribute('aria-expanded', isOpen);
    });

    sortDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.spectrum-toolbar__sort-option');
      if (!option) return;

      const sortValue = option.dataset.value;

      // Update active state
      sortDropdown.querySelectorAll('.spectrum-toolbar__sort-option').forEach((o) => {
        o.classList.remove('is-active');
        o.removeAttribute('aria-selected');
      });
      option.classList.add('is-active');
      option.setAttribute('aria-selected', 'true');

      // Close dropdown
      sortDropdown.classList.remove('is-open');
      sortBtn.setAttribute('aria-expanded', 'false');

      // Update sort_by in URL and trigger AJAX render
      const url = new URL(window.location);
      url.searchParams.set('sort_by', sortValue);
      const searchParams = url.searchParams.toString();
      FacetFiltersForm.renderPage(searchParams);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#SpectrumSortWrapper')) {
        sortDropdown.classList.remove('is-open');
        sortBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sortDropdown.classList.contains('is-open')) {
        sortDropdown.classList.remove('is-open');
        sortBtn.setAttribute('aria-expanded', 'false');
        sortBtn.focus();
      }
    });
  }

  // --- GRID TOGGLE ---
  const gridToggle = document.getElementById('SpectrumGridToggle');
  const mobileMediaQuery = window.matchMedia('(max-width: 749px)');

  function getProductGrid() {
    return document.getElementById('product-grid');
  }

  function isMobileViewport() {
    return mobileMediaQuery.matches;
  }

  function applyGridPreference() {
    const grid = getProductGrid();
    if (!grid) return;

    const storedDesktop = sessionStorage.getItem('spectrum-grid-cols');
    const storedMobile = sessionStorage.getItem('spectrum-grid-cols-mobile');

    if (!storedDesktop && !storedMobile) return;

    // Only remove/replace the class type that has a stored preference
    // This preserves server-rendered classes for the other viewport
    if (storedDesktop) {
      Array.from(grid.classList).forEach((cls) => {
        if (cls.match(/grid--\d+-col-desktop/)) grid.classList.remove(cls);
      });
      grid.classList.add('grid--' + storedDesktop + '-col-desktop');
    }

    if (storedMobile) {
      Array.from(grid.classList).forEach((cls) => {
        if (cls.match(/grid--\d+-col-tablet-down/)) grid.classList.remove(cls);
      });
      grid.classList.add('grid--' + storedMobile + '-col-tablet-down');
    }

    // Update active button states based on current viewport
    if (gridToggle) {
      const isMobile = isMobileViewport();
      const activeCols = isMobile ? storedMobile : storedDesktop;
      gridToggle.querySelectorAll('button').forEach((btn) => {
        const isMobileBtn = btn.dataset.mobileOnly === 'true';
        if (isMobile) {
          // On mobile: activate based on mobile storage, but only for visible buttons
          btn.classList.toggle('is-active', btn.dataset.cols === activeCols && !btn.classList.contains('small-hide'));
        } else {
          // On desktop: activate based on desktop storage, skip mobile-only buttons
          btn.classList.toggle('is-active', !isMobileBtn && btn.dataset.cols === activeCols);
        }
      });
    }
  }

  if (gridToggle) {
    // Set initial active state
    const storedDesktop = sessionStorage.getItem('spectrum-grid-cols');
    const storedMobile = sessionStorage.getItem('spectrum-grid-cols-mobile');

    if (storedDesktop || storedMobile) {
      applyGridPreference();
    } else {
      // Detect current grid columns from existing classes
      const grid = getProductGrid();
      if (grid) {
        const desktopMatch = Array.from(grid.classList).find((cls) => cls.match(/grid--(\d+)-col-desktop/));
        const mobileMatch = Array.from(grid.classList).find((cls) => cls.match(/grid--(\d+)-col-tablet-down/));
        const isMobile = isMobileViewport();

        if (desktopMatch && !isMobile) {
          const cols = desktopMatch.match(/grid--(\d+)-col-desktop/)[1];
          gridToggle.querySelectorAll('button').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.mobileOnly !== 'true' && btn.dataset.cols === cols);
          });
        }
        if (mobileMatch && isMobile) {
          const cols = mobileMatch.match(/grid--(\d+)-col-tablet-down/)[1];
          gridToggle.querySelectorAll('button').forEach((btn) => {
            btn.classList.toggle('is-active', !btn.classList.contains('small-hide') && btn.dataset.cols === cols);
          });
        }
      }
    }

    gridToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cols]');
      if (!btn) return;

      const cols = btn.dataset.cols;
      const isMobile = isMobileViewport();

      if (isMobile) {
        sessionStorage.setItem('spectrum-grid-cols-mobile', cols);
      } else {
        sessionStorage.setItem('spectrum-grid-cols', cols);
      }

      // Update active state only for buttons visible in current viewport
      gridToggle.querySelectorAll('button').forEach((b) => {
        const isMobileBtn = b.dataset.mobileOnly === 'true';
        if (isMobile) {
          if (!b.classList.contains('small-hide')) b.classList.remove('is-active');
        } else {
          if (!isMobileBtn) b.classList.remove('is-active');
        }
      });
      btn.classList.add('is-active');

      applyGridPreference();
    });

    // Re-evaluate active states on viewport resize
    mobileMediaQuery.addEventListener('change', () => {
      applyGridPreference();
    });
  }

  // --- PATCH: Re-apply grid preference after AJAX renders ---
  const origRenderProductGridContainer = FacetFiltersForm.renderProductGridContainer;
  FacetFiltersForm.renderProductGridContainer = function (html) {
    origRenderProductGridContainer(html);
    applyGridPreference();
  };

  // --- PATCH: Re-init drawer nav after AJAX filter updates ---
  const origRenderAdditionalElements = FacetFiltersForm.renderAdditionalElements;
  FacetFiltersForm.renderAdditionalElements = function (html) {
    origRenderAdditionalElements(html);
    // Re-apply first nav item as active if no active state exists
    const nav = document.getElementById('SpectrumFilterNav');
    if (nav && !nav.querySelector('.is-active')) {
      const firstNav = nav.querySelector('.spectrum-drawer__nav-item');
      if (firstNav) firstNav.classList.add('is-active');
      const body = nav.closest('.spectrum-drawer__body');
      if (body) {
        const firstPanel = body.querySelector('.spectrum-drawer__panel');
        if (firstPanel) firstPanel.classList.add('is-active');
      }
    }
  };

  // --- PRICE RANGE SLIDER ---
  function initPriceSliders() {
    document.querySelectorAll('.spectrum-price-slider').forEach((slider) => {
      const rangeMin = slider.querySelector('.spectrum-price-slider__range--min');
      const rangeMax = slider.querySelector('.spectrum-price-slider__range--max');
      const trackFill = slider.querySelector('.spectrum-price-slider__track-fill');
      const inputMin = slider.querySelector('input[type="number"][name$=".gte"]') ||
                       slider.querySelectorAll('.spectrum-price-slider__input')[0];
      const inputMax = slider.querySelector('input[type="number"][name$=".lte"]') ||
                       slider.querySelectorAll('.spectrum-price-slider__input')[1];

      if (!rangeMin || !rangeMax || !trackFill) return;

      const sliderMin = parseFloat(rangeMin.min) || 0;
      const sliderMax = parseFloat(rangeMin.max) || 100;

      function updateTrackFill() {
        const minVal = parseFloat(rangeMin.value) || 0;
        const maxVal = parseFloat(rangeMax.value) || sliderMax;
        const range = sliderMax - sliderMin;
        if (range <= 0) return;
        const leftPct = ((minVal - sliderMin) / range) * 100;
        const rightPct = ((maxVal - sliderMin) / range) * 100;
        trackFill.style.left = leftPct + '%';
        trackFill.style.width = (rightPct - leftPct) + '%';
      }

      // Slider → text input sync (real-time)
      rangeMin.addEventListener('input', () => {
        const minVal = parseFloat(rangeMin.value);
        const maxVal = parseFloat(rangeMax.value);
        if (minVal > maxVal) rangeMin.value = maxVal;
        if (inputMin) inputMin.value = Math.round(rangeMin.value);
        updateTrackFill();
      });

      rangeMax.addEventListener('input', () => {
        const minVal = parseFloat(rangeMin.value);
        const maxVal = parseFloat(rangeMax.value);
        if (maxVal < minVal) rangeMax.value = minVal;
        if (inputMax) inputMax.value = Math.round(rangeMax.value);
        updateTrackFill();
      });

      // Slider change → trigger form submission
      rangeMin.addEventListener('change', () => {
        if (inputMin) {
          inputMin.value = Math.round(rangeMin.value);
          inputMin.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      rangeMax.addEventListener('change', () => {
        if (inputMax) {
          inputMax.value = Math.round(rangeMax.value);
          inputMax.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Text input → slider sync
      if (inputMin) {
        inputMin.addEventListener('change', () => {
          let val = parseFloat(inputMin.value) || 0;
          if (val < sliderMin) val = sliderMin;
          if (val > parseFloat(rangeMax.value)) val = parseFloat(rangeMax.value);
          rangeMin.value = val;
          inputMin.value = Math.round(val);
          updateTrackFill();
        });
      }

      if (inputMax) {
        inputMax.addEventListener('change', () => {
          let val = parseFloat(inputMax.value) || sliderMax;
          if (val > sliderMax) val = sliderMax;
          if (val < parseFloat(rangeMin.value)) val = parseFloat(rangeMin.value);
          rangeMax.value = val;
          inputMax.value = Math.round(val);
          updateTrackFill();
        });
      }

      // Initial fill
      updateTrackFill();
    });
  }

  // Init on page load
  initPriceSliders();

  // Re-init after AJAX filter updates
  const origRenderFilters = FacetFiltersForm.renderFilters;
  if (origRenderFilters) {
    FacetFiltersForm.renderFilters = function (html) {
      origRenderFilters(html);
      requestAnimationFrame(initPriceSliders);
    };
  }
})();
