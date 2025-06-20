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


(function() {
  try {
    if (localStorage.getItem('sidebarClosed') === 'true') {
   
      var style = document.createElement('style');
      style.id = 'sidebar-initial-state';
      style.innerHTML = '#sidebar{width:60px!important;padding:5px!important;transition:none!important}#toggle-btn svg{transform:rotate(180deg)!important;transition:none!important}#sidebar .btn-text,#sidebar .chat-title,#sidebar .chat-item,#sidebar .sidebar-footer-text{display:none!important}#sidebar .sidebar-footer-copyright{display:block!important}';
      

      var head = document.head || document.getElementsByTagName('head')[0];
      head.insertBefore(style, head.firstChild);
    }
  } catch (e) {}
})();


document.addEventListener('DOMContentLoaded', function() {
  try {
    const savedState = localStorage.getItem('sidebarClosed');
    if (savedState === 'true') {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('toggle-btn');
      
      if (sidebar && toggleBtn) {
        sidebar.classList.add('close');
        toggleBtn.classList.add('rotated');
        

        setTimeout(() => {
          const tempStyle = document.getElementById('sidebar-initial-state');
          if (tempStyle) {
            tempStyle.remove();
          }
        }, 200);
      }
    }
  } catch (error) {
    console.warn('localStorage not available:', error);
  }
});


const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');


function saveSidebarState(isClosed) {
  try {
    localStorage.setItem('sidebarClosed', isClosed.toString());
  } catch (error) {
    console.warn('Could not save sidebar state:', error);
  }
}

function toggleSidebar() {

  const tempStyle = document.getElementById('sidebar-initial-state');
  if (tempStyle) {
    tempStyle.remove();
  }
  
  sidebar.classList.toggle('close');
  toggleBtn.classList.toggle('rotated');
  
 
  const isClosed = sidebar.classList.contains('close');
  saveSidebarState(isClosed);
}


function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}


function toggleSidebarWithCookies() {
  sidebar.classList.toggle('close');
  toggleBtn.classList.toggle('rotated');
  
  const isClosed = sidebar.classList.contains('close');
  setCookie('sidebarClosed', isClosed, 30); 
}

function loadSidebarStateFromCookies() {
  const savedState = getCookie('sidebarClosed');
  if (savedState === 'true') {
    sidebar.classList.add('close');
    toggleBtn.classList.add('rotated');
  }
}