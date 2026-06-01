export function initScrolly(root, onSectionChange) {
  const sections = Array.from(root.querySelectorAll('[data-scrolly-section]'));
  if (sections.length === 0) {
    return { destroy: () => {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = entry.target;
          const sectionId = section.getAttribute('data-scrolly-section') || '';
          sections.forEach((item) => {
            item.classList.toggle('is-active', item === section);
          });
          section.classList.add('is-visible');
          if (onSectionChange) {
            onSectionChange(sectionId, section);
          }
        }
      });
    },
    {
      threshold: 0.45,
      rootMargin: '-12% 0px -18% 0px',
    },
  );

  sections.forEach((section) => {
    observer.observe(section);
  });

  return {
    destroy: () => {
      observer.disconnect();
    },
  };
}
