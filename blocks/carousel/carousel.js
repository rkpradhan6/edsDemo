(function(){
  // Accessible, lightweight carousel for blocks/carousel
  // Usage: markup should contain a root element with class `carousel` and
  // a container with class `carousel__track` containing slides with class `carousel__slide`.
  // Optional prev/next buttons with data-carousel-prev and data-carousel-next attributes.
  // Optional dots container with data-carousel-dots
  
  class Carousel {
    constructor(root, options = {}) {
      this.root = root;
      this.track = root.querySelector('.carousel__track');
      this.slides = Array.from(this.track ? this.track.children : []);
      this.prevBtn = root.querySelector('[data-carousel-prev]');
      this.nextBtn = root.querySelector('[data-carousel-next]');
      this.dotsContainer = root.querySelector('[data-carousel-dots]');
      this.currentIndex = 0;
      this.loop = options.loop ?? true;
      this.interval = options.interval ?? 5000;
      this.timer = null;
      this.pauseOnHover = options.pauseOnHover ?? true;
      this.announceEl = null; // for live region

      if (!this.root || !this.track || this.slides.length === 0) return;

      this.setup();
      this.bind();
      this.goTo(0);
      if (this.interval > 0) this.play();
    }

    setup() {
      this.root.classList.add('carousel--js');
      this.track.setAttribute('role', 'list');
      this.slides.forEach((s, i) => {
        s.classList.add('carousel__slide');
        s.setAttribute('role', 'listitem');
        s.setAttribute('aria-roledescription', 'slide');
        s.setAttribute('data-carousel-index', i);
      });

      // Create live region for announcements
      this.announceEl = document.createElement('div');
      this.announceEl.className = 'carousel__live';
      this.announceEl.setAttribute('aria-live', 'polite');
      this.announceEl.setAttribute('aria-atomic', 'true');
      this.announceEl.style.position = 'absolute';
      this.announceEl.style.width = '1px';
      this.announceEl.style.height = '1px';
      this.announceEl.style.overflow = 'hidden';
      this.announceEl.style.clip = 'rect(1px, 1px, 1px, 1px)';
      this.announceEl.style.whiteSpace = 'nowrap';
      this.root.appendChild(this.announceEl);

      // Create dots if missing but requested in markup
      if (this.dotsContainer) {
        this.renderDots();
      }

      // Hide prev/next if not provided
      if (!this.prevBtn || !this.nextBtn) {
        // create basic controls
        const controls = document.createElement('div');
        controls.className = 'carousel__controls';
        this.prevBtn = this.prevBtn || this.makeButton('Previous', 'prev');
        this.nextBtn = this.nextBtn || this.makeButton('Next', 'next');
        controls.appendChild(this.prevBtn);
        controls.appendChild(this.nextBtn);
        this.root.appendChild(controls);
      }
    }

    makeButton(label, dir) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `carousel__button carousel__button--${dir}`;
      btn.setAttribute('aria-label', label);
      btn.textContent = label;
      return btn;
    }

    renderDots() {
      // clear
      this.dotsContainer.innerHTML = '';
      this.dots = this.slides.map((_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'carousel__dot';
        btn.setAttribute('aria-label', `Go to slide ${i+1}`);
        btn.setAttribute('data-carousel-dot-index', i);
        this.dotsContainer.appendChild(btn);
        return btn;
      });
    }

    bind() {
      this.nextBtn.addEventListener('click', () => this.next());
      this.prevBtn.addEventListener('click', () => this.prev());

      if (this.dotsContainer) {
        this.dotsContainer.addEventListener('click', (e) => {
          const b = e.target.closest('[data-carousel-dot-index]');
          if (!b) return;
          const idx = Number(b.getAttribute('data-carousel-dot-index'));
          this.goTo(idx);
          this.resetTimer();
        });
      }

      // keyboard navigation
      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); this.resetTimer(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); this.resetTimer(); }
      });

      // pause on hover/focus
      if (this.pauseOnHover) {
        this.root.addEventListener('mouseenter', () => this.pause());
        this.root.addEventListener('mouseleave', () => this.play());
        this.root.addEventListener('focusin', () => this.pause());
        this.root.addEventListener('focusout', () => this.play());
      }

      // make slides focusable for keyboard users
      this.slides.forEach(s => s.setAttribute('tabindex', '-1'));
    }

    updateUI() {
      this.slides.forEach((s, i) => {
        if (i === this.currentIndex) {
          s.classList.add('is-active');
          s.removeAttribute('aria-hidden');
          s.setAttribute('tabindex', '0');
        } else {
          s.classList.remove('is-active');
          s.setAttribute('aria-hidden', 'true');
          s.setAttribute('tabindex', '-1');
        }
      });

      if (this.dots && this.dots.length) {
        this.dots.forEach((d, i) => {
          if (i === this.currentIndex) d.classList.add('is-active'); else d.classList.remove('is-active');
          d.setAttribute('aria-pressed', i === this.currentIndex ? 'true' : 'false');
        });
      }

      // announce
      const slide = this.slides[this.currentIndex];
      const label = slide.getAttribute('data-carousel-label') || `Slide ${this.currentIndex + 1} of ${this.slides.length}`;
      this.announceEl.textContent = label;
    }

    goTo(index) {
      if (index < 0) index = this.loop ? this.slides.length - 1 : 0;
      if (index >= this.slides.length) index = this.loop ? 0 : this.slides.length - 1;
      this.currentIndex = index;

      // translate track if using horizontal layout
      if (this.track) {
        const offset = -index * 100;
        this.track.style.transform = `translateX(${offset}%)`;
        this.track.style.transition = 'transform 360ms ease';
      }

      this.updateUI();
    }

    next() { this.goTo(this.currentIndex + 1); }
    prev() { this.goTo(this.currentIndex - 1); }

    play() {
      if (this.interval <= 0) return;
      this.pause();
      this.timer = setInterval(() => this.next(), this.interval);
    }

    pause() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    resetTimer() { this.pause(); this.play(); }
  }

  // Initialize carousels on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else initAll();

  function initAll() {
    const roots = document.querySelectorAll('.carousel, .eds-carousel');
    roots.forEach(r => {
      // allow passing options via dataset (data-carousel-interval, data-carousel-loop)
      const opts = {};
      if (r.dataset.carouselInterval) opts.interval = Number(r.dataset.carouselInterval);
      if (r.dataset.carouselLoop) opts.loop = r.dataset.carouselLoop === 'true';
      if (r.dataset.carouselPauseOnHover) opts.pauseOnHover = r.dataset.carouselPauseOnHover === 'true';
      new Carousel(r, opts);
    });
  }

  // expose for testing
  window.EdsCarousel = { Carousel };
})();


import { fetchPlaceholders } from '../../scripts/placeholders.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
