/** Action: call callback when clicking outside the element */
export function clickOutside(node, callback) {
  function handleClick(e) {
    if (node && !node.contains(e.target)) {
      callback();
    }
  }
  document.addEventListener('click', handleClick, true);
  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
  };
}
