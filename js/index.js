
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
  box.style.borderRadius = '12px';
  box.style.background = 'rgba(255, 255, 255, 0.015)';
  box.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease';
  
  const icon = box.querySelector('.box-icon');
  if (icon) {
    icon.style.transition = 'transform 0.4s ease';
    icon.style.display = 'inline-block';
    icon.style.verticalAlign = 'middle';
    icon.style.transformOrigin = 'center center';
    icon.style.transform = 'translateY(-50%)';
  }
  
  box.addEventListener('mouseenter', () => {
    box.style.transform = 'scale(1.05)';
    box.style.background = 'rgba(255, 255, 255, 0.07)';
    if (icon) {
      icon.style.transform = 'translateY(-50%)';
    }
  });
  
  box.addEventListener('mouseleave', () => {
    box.style.transform = 'scale(1)';
    box.style.background = 'rgba(255, 255, 255, 0.015)';
    if (icon) {
      icon.style.transform = 'translateY(-50%)';
    }
  });
});


function saveSidebarState(isClosed) {
  try {
    localStorage.setItem('sidebarClosed', isClosed.toString());
  } catch (error) {
    console.warn('Could not save sidebar state:', error);
  }
}

function getSidebarState() {
  try {
    return localStorage.getItem('sidebarClosed') === 'true';
  } catch (error) {
    console.warn('Could not get sidebar state:', error);
    return false;
  }
}


document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-btn');
  

  const tempStyle = document.getElementById('sidebar-initial-state');
  if (tempStyle) {
    tempStyle.remove();
  }
  

  if (sidebar && toggleBtn) {
    const savedState = getSidebarState();
    if (savedState) {
      sidebar.classList.add('close');
      toggleBtn.classList.add('rotated');
    }
  }
  

  const signinBtn = document.getElementById('signin-btn');
  if (signinBtn) {
    signinBtn.addEventListener('click', function() {
      window.location.href = 'Auth/signin.html';
    });
  }
});


function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-btn');
  
  if (!sidebar || !toggleBtn) return;
  

  const tempStyle = document.getElementById('sidebar-initial-state');
  if (tempStyle) {
    tempStyle.remove();
  }
  
  sidebar.classList.toggle('close');
  toggleBtn.classList.toggle('rotated');
  
  const isClosed = sidebar.classList.contains('close');
  saveSidebarState(isClosed);
}