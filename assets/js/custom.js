document.documentElement.classList.remove('no-js');
console.log('no-js class removed');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded fired');
  
  // News toggle functionality
  const newsToggle = document.querySelector('.news-toggle');
  const newsExpanded = document.querySelector('.news-expanded');
  
  if (newsToggle && newsExpanded) {
    newsToggle.addEventListener('click', function() {
      newsExpanded.classList.toggle('show');
      newsToggle.classList.toggle('active');
      
      if (newsExpanded.classList.contains('show')) {
        newsToggle.innerHTML = '<i class="fas fa-chevron-up"></i> Show Less';
      } else {
        newsToggle.innerHTML = '<i class="fas fa-chevron-down"></i> View More Updates';
      }
    });
  }

  // Navigation toggle functionality
  const navToggle = document.querySelector('.greedy-nav__toggle');
  const navLinks = document.querySelector('.visible-links');
  const nav = document.querySelector('.greedy-nav');
  
  console.log('Nav elements:', { 
    navToggle: navToggle, 
    navLinks: navLinks, 
    nav: nav 
  });

  if (navToggle && navLinks && nav) {
    console.log('Adding click listener to navToggle');
    
    navToggle.addEventListener('click', function(e) {
      console.log('NavToggle clicked');
      e.preventDefault();
      e.stopPropagation();
      navLinks.classList.toggle('show');
      nav.classList.toggle('nav-open');
      console.log('Classes after toggle:', {
        navLinksClasses: navLinks.classList.toString(),
        navClasses: nav.classList.toString()
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.greedy-nav') && navLinks.classList.contains('show')) {
        console.log('Closing menu from outside click');
        navLinks.classList.remove('show');
        nav.classList.remove('nav-open');
      }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (!isMobile) {
        console.log('Closing menu from resize');
        navLinks.classList.remove('show');
        nav.classList.remove('nav-open');
      }
    });
  } else {
    console.log('Failed to find one or more nav elements');
  }
}); 