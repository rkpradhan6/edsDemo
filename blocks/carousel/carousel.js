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
