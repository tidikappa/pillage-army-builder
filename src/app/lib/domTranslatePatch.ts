// Google Translate (Chrome's built-in page translation) rewrites text nodes
// by wrapping them in <font> tags. React then crashes with
// "NotFoundError: Failed to execute 'removeChild' on 'Node'" (or the
// insertBefore equivalent) the next time it reconciles those nodes, leaving
// a blank page.
//
// This is the community-standard mitigation from the React issue tracker
// (facebook/react#11538): make removeChild / insertBefore tolerant when the
// child was hijacked by the translator instead of throwing.
export function installTranslateDomPatch() {
  if (typeof Node !== "function" || !Node.prototype) return;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== "undefined") {
        console.warn("Ignored removeChild on a node hijacked by the page translator", child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== "undefined") {
        console.warn("Ignored insertBefore with a reference node hijacked by the page translator", referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
