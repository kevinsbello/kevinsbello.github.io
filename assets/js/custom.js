document.addEventListener('DOMContentLoaded', function() {
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

  const sidebarToggle = document.querySelector('.author__urls-wrapper .btn');
  const sidebarLinks = document.querySelector('.author__urls');
  
  if (sidebarToggle && sidebarLinks) {
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i> Follow';
    
    sidebarToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      sidebarLinks.classList.toggle('is-visible');
      
      if (sidebarLinks.classList.contains('is-visible')) {
        sidebarToggle.innerHTML = '<i class="fas fa-times"></i> Close';
      } else {
        sidebarToggle.innerHTML = '<i class="fas fa-bars"></i> Follow';
      }
    });
    
    document.addEventListener('click', function(e) {
      if (!sidebarLinks.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebarLinks.classList.remove('is-visible');
        sidebarToggle.innerHTML = '<i class="fas fa-bars"></i> Follow';
      }
    });
  }
}); 