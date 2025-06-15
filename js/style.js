const input = document.getElementById('input');
const inputArea = document.getElementById('input-area');

input.addEventListener('focus', () => {
  inputArea.classList.add('no-transition');
});

input.addEventListener('blur', () => {
  inputArea.classList.remove('no-transition');
});


const sendButton = document.getElementById('send');


const boxes = document.querySelectorAll('.placeholder-box');
const revealBoxes = () => {
  boxes.forEach(box => {
    const boxTop = box.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    if (boxTop < windowHeight - 50) {
      box.style.opacity = 1;
      box.style.transform = 'translateY(0)';
    }
  });
};
window.addEventListener('scroll', revealBoxes);
window.addEventListener('load', () => {
  boxes.forEach(box => {
    box.style.opacity = 0;
    box.style.transform = 'translateY(40px)';
    box.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    box.style.willChange = 'transform, opacity';
  });
  revealBoxes();
});

document.querySelectorAll('.nav-button').forEach(button => {
  button.style.cursor = 'pointer';
  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(255, 255, 255, 0.15)';
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 0 12px 2px rgba(255, 255, 255, 0.3)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent';
    button.style.transform = 'scale(1)';
    button.style.boxShadow = 'none';
  });
});

boxes.forEach(box => {
  box.style.cursor = 'pointer';
  box.style.marginBottom = '14px';
  box.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
  box.style.borderRadius = '12px';
  box.style.background = 'rgba(255, 255, 255, 0.015)';
  box.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease, box-shadow 0.4s ease';

  const icon = box.querySelector('.box-icon');
  if (icon) {
    icon.style.transition = 'transform 0.4s ease, filter 0.4s ease';
    icon.style.display = 'inline-block';
    icon.style.verticalAlign = 'middle';
    icon.style.transformOrigin = 'center center';
    icon.style.transform = 'translateY(-50%)';
  }

  box.addEventListener('mouseenter', () => {
    box.style.transform = 'translateY(-6px) scale(1.04)';
    box.style.background = 'rgba(255, 255, 255, 0.07)';
    box.style.boxShadow = '0 8px 20px rgba(255, 255, 255, 0.15)';
    if (icon) {
      icon.style.transform = 'translateY(-50%) scale(1.25) rotate(10deg)';
      icon.style.filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.4))';
    }
  });

  box.addEventListener('mouseleave', () => {
    box.style.transform = 'translateY(0) scale(1)';
    box.style.background = 'rgba(255, 255, 255, 0.015)';
    box.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
    if (icon) {
      icon.style.transform = 'translateY(-50%) scale(1) rotate(0deg)';
      icon.style.filter = 'none';
    }
  });
});

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');

function toggleSidebar() {
  sidebar.classList.toggle('close');
  toggleBtn.classList.toggle('rotated');
}