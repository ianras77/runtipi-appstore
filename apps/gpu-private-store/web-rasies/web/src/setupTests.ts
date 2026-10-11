import '@testing-library/jest-dom';

// jsdom stub for components that call scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};
