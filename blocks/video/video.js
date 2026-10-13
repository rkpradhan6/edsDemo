export default function decorate(block) {
  block.classList.add('video-block');

  const videoLink = [...block.querySelectorAll('a')].find((link) => {
    const href = link.getAttribute('href') || '';
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(href);
  });

  if (!videoLink) {
    const fallbackText = document.createElement('p');
    fallbackText.textContent = 'Video source not found.';
    block.replaceChildren(fallbackText);
    return;
  }

  const video = document.createElement('video');
  video.src = videoLink.href;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', 'Video player');

  const controls = document.createElement('div');
  controls.className = 'video-controls';

  const playPauseButton = document.createElement('button');
  playPauseButton.type = 'button';
  playPauseButton.textContent = 'Play';

  const muteButton = document.createElement('button');
  muteButton.type = 'button';
  muteButton.textContent = 'Mute';

  const syncButtons = () => {
    playPauseButton.textContent = video.paused ? 'Play' : 'Pause';
    muteButton.textContent = video.muted ? 'Unmute' : 'Mute';
  };

  playPauseButton.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    syncButtons();
  });

  muteButton.addEventListener('click', () => {
    video.muted = !video.muted;
    syncButtons();
  });

  video.addEventListener('play', syncButtons);
  video.addEventListener('pause', syncButtons);
  video.addEventListener('volumechange', syncButtons);

  controls.append(playPauseButton, muteButton);
  block.replaceChildren(video, controls);
  syncButtons();
}
