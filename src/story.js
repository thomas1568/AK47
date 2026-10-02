import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FilmPlayer } from './film-player.js';

export function initStory({ onChapter } = {}) {
  const story = document.querySelector('.story-layout');
  const media = document.querySelector('.story-media');
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.timeline-nav a')];
  const year = document.querySelector('.film-year');
  const status = document.querySelector('#film-status');
  const toggle = document.querySelector('#motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const bars = gsap.quickSetter('.timeline-progress span, .film-meter span', 'scaleX');
  let frozen = preference.matches, active = -1, state = 'loading';
  let boundaries = [];
  const player = new FilmPlayer({ canvas: document.querySelector('#film-canvas'), video: document.querySelector('#history-video'), container: media, onState(value) {
    if (state === value) return;
    state = value; media.classList.toggle('is-ready', value === 'ready'); updateStatus();
  } });
  player.freeze(frozen);

  function updateStatus() {
    toggle.setAttribute('aria-pressed', String(frozen));
    toggle.textContent = frozen ? 'Reprendre ↘' : 'Figer Ⅱ';
    status.textContent = state === 'error' ? 'Aperçu disponible' : frozen ? 'Le temps est suspendu' : state === 'ready' ? 'Votre défilement donne le rythme' : 'Préparation du film…';
  }
  function setChapter(index) {
    if (active === index) return;
    const backwards = index < active; active = index;
    links.forEach((link, i) => {
      link.classList.toggle('active', i === index);
      if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });
    year.textContent = chapters[index].dataset.year;
    year.classList.toggle('is-today', index === 4);
    document.querySelector('#film-era').textContent = chapters[index].dataset.era;
    document.querySelector('#film-count').textContent = `0${index + 1} / 05`;
    if (!preference.matches) gsap.fromTo(year, { y: backwards ? -20 : 20, opacity: 0 }, { y: 0, opacity: 1, duration: .6, overwrite: true, ease: 'power2.out' });
    onChapter?.(index);
  }
  function measure() { boundaries = chapters.map(chapter => chapter.getBoundingClientRect().top + scrollY); }
  function update(track) {
    const probe = scrollY + innerHeight * .5;
    let index = 0; boundaries.forEach((top, i) => { if (probe >= top) index = i; });
    setChapter(index);
    bars(track.progress); player.setProgress(track.progress);
  }
  measure();
  const track = ScrollTrigger.create({ trigger: story, start: 'top top', end: 'bottom bottom', onUpdate: update, onToggle: self => document.body.classList.toggle('in-story', self.isActive), onRefresh(self) { measure(); update(self); } });
  const animations = gsap.matchMedia();
  animations.add('(prefers-reduced-motion: no-preference)', () => {
    chapters.forEach(chapter => {
      const body = chapter.querySelector('.chapter-body');
      gsap.timeline({ scrollTrigger: { trigger: chapter, start: 'top 90%', end: 'bottom 10%', scrub: .45 } })
        .fromTo(body, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .25, ease: 'none' })
        .to(body, { opacity: 1, duration: .5 })
        .to(body, { y: -40, opacity: 0, duration: .25, ease: 'none' });
    });
  });

  function freeze(value) { frozen = value; player.freeze(value); updateStatus(); }
  toggle.addEventListener('click', () => freeze(!frozen));
  preference.addEventListener('change', event => freeze(event.matches));
  let navigating = false;
  addEventListener('scrollend', () => { navigating = false; });
  addEventListener('wheel', () => { if (navigating) { scrollTo({ top: scrollY, behavior: 'instant' }); navigating = false; } }, { passive: true });
  links.forEach((link, i) => link.addEventListener('click', event => {
    event.preventDefault();
    const chapter = chapters[i];
    const top = chapter.getBoundingClientRect().top + scrollY + chapter.offsetHeight / 2 - innerHeight / 2;
    history.replaceState(null, '', link.hash);
    navigating = !preference.matches;
    scrollTo({ top, behavior: preference.matches ? 'instant' : 'smooth' });
  }));

  const dialog = document.querySelector('#image-dialog');
  const expanded = document.querySelector('#expanded-image');
  document.querySelectorAll('.image-zoom').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    expanded.src = link.href; expanded.alt = link.querySelector('img').alt;
    document.querySelector('#image-title').textContent = link.closest('figure').querySelector('figcaption span').textContent;
    dialog.showModal();
  }));
  document.querySelector('#close-image').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { const box = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close(); });
  updateStatus();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  return { refresh: () => track.refresh() };
}
