class VanishingNotepad {
    constructor() {
        this.editor = document.getElementById('notepad-editor');
        this.charCountElement = document.getElementById('char-count');
        
        // State management
        this.originalText = '';
        this.displayText = '';
        this.vanishStartIndex = 0;
        this.isVanishing = false;
        this.vanishTimer = null;
        this.firstTypeDelay = null;
        this.hasStartedTyping = false;
        this.maxCharacters = 1000;
        
        // Unicode whitespace characters for replacement
        this.whitespaceChars = ['\u2002', '\u2003', '\u2009', '\u200A', '\u2005'];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Handle input events
        this.editor.addEventListener('input', (e) => this.handleInput(e));
        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Handle copy events for obfuscation
        this.editor.addEventListener('copy', (e) => this.handleCopy(e));
        
        // Prevent context menu to make copying harder
        this.editor.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    handleInput(e) {
        const currentText = this.editor.textContent || '';
        
        // Enforce character limit
        if (currentText.length > this.maxCharacters) {
            const truncated = currentText.substring(0, this.maxCharacters);
            this.editor.textContent = truncated;
            this.placeCursorAtEnd();
            return;
        }
        
        // Update original text tracking
        this.originalText = currentText;
        this.displayText = currentText;
        
        // Start the vanishing timer on first input
        if (!this.hasStartedTyping && currentText.length > 0) {
            this.hasStartedTyping = true;
            this.startVanishingCountdown();
        }
        
        this.updateCharacterCount();
    }
    
    handleKeydown(e) {
        // Prevent typing if at character limit
        const currentLength = this.editor.textContent?.length || 0;
        if (currentLength >= this.maxCharacters && 
            !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
    }
    
    handlePaste(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const currentText = this.editor.textContent || '';
        const newText = currentText + pastedText;
        
        if (newText.length <= this.maxCharacters) {
            document.execCommand('insertText', false, pastedText);
        } else {
            const allowedLength = this.maxCharacters - currentText.length;
            const truncatedPaste = pastedText.substring(0, allowedLength);
            document.execCommand('insertText', false, truncatedPaste);
        }
    }
    
    handleCopy(e) {
        e.preventDefault();
        
        // Create obfuscated text with only invisible characters
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        if (selectedText) {
            // Replace all visible characters with random whitespace
            const obfuscatedText = selectedText.split('').map(() => {
                return this.whitespaceChars[Math.floor(Math.random() * this.whitespaceChars.length)];
            }).join('');
            
            // Copy the obfuscated text
            e.clipboardData.setData('text/plain', obfuscatedText);
        }
    }
    
    startVanishingCountdown() {
        // Wait 2 seconds before starting to vanish
        this.firstTypeDelay = setTimeout(() => {
            this.startVanishing();
        }, 2000);
    }
    
    startVanishing() {
        if (this.isVanishing) return;
        
        this.isVanishing = true;
        this.vanishStartIndex = 0;
        
        // Vanish one character every 100ms
        this.vanishTimer = setInterval(() => {
            this.vanishNextCharacter();
        }, 100);
    }
    
    vanishNextCharacter() {
        const currentText = this.editor.textContent || '';
        
        if (this.vanishStartIndex >= currentText.length) {
            // No more characters to vanish at the moment
            return;
        }
        
        // Get current cursor position
        const cursorPosition = this.getCursorPosition();
        
        // Replace the character at vanishStartIndex with whitespace
        const beforeChar = currentText.substring(0, this.vanishStartIndex);
        const afterChar = currentText.substring(this.vanishStartIndex + 1);
        const randomWhitespace = this.whitespaceChars[Math.floor(Math.random() * this.whitespaceChars.length)];
        
        const newText = beforeChar + randomWhitespace + afterChar;
        
        // Update the editor content
        this.editor.textContent = newText;
        
        // Restore cursor position
        this.setCursorPosition(cursorPosition);
        
        // Move to next character
        this.vanishStartIndex++;
    }
    
    getCursorPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        return preCaretRange.toString().length;
    }
    
    setCursorPosition(position) {
        const selection = window.getSelection();
        const range = document.createRange();
        
        let currentPos = 0;
        const walker = document.createTreeWalker(
            this.editor,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            if (currentPos + nodeLength >= position) {
                range.setStart(node, position - currentPos);
                range.setEnd(node, position - currentPos);
                break;
            }
            currentPos += nodeLength;
        }
        
        // If we couldn't find the exact position, place at end
        if (!range.startContainer) {
            range.selectNodeContents(this.editor);
            range.collapse(false);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    placeCursorAtEnd() {
        const range = document.createRange();
        const selection = window.getSelection();
        
        range.selectNodeContents(this.editor);
        range.collapse(false);
        
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    updateCharacterCount() {
        const currentLength = this.editor.textContent?.length || 0;
        this.charCountElement.textContent = currentLength;
    }
    
    destroy() {
        if (this.vanishTimer) {
            clearInterval(this.vanishTimer);
        }
        if (this.firstTypeDelay) {
            clearTimeout(this.firstTypeDelay);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const notepad = new VanishingNotepad();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        notepad.destroy();
    });
});
