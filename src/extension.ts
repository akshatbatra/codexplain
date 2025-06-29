// filepath: c:\Users\ACS\codexplain\src\extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent, getCodeExplanation } from './utils/voicePlayer';

export function activate(context: vscode.ExtensionContext) {
  console.log('CodeXplain extension activated');
  
  // Create a decoration type for the CodeXplain button
  let codeExplainDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
          margin: '0 0 0 5px',
          height: 'auto',
          width: 'auto',
          textDecoration: 'none',
          contentText: '', // Remove default content text
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });

  // Declare global variables
  let activeEditor = vscode.window.activeTextEditor;
  let timeout: NodeJS.Timer | undefined = undefined;
  let lastSelectionText = '';
  let currentSelectionForExplain = ''; // Add this variable to store the current selection text
  let activeExplainPanel: vscode.WebviewPanel | undefined = undefined; // Track the active explain panel
  
  // Track decoration ranges for click detection
  const decorationRanges = new Map<string, vscode.Range>();
  
  // Update the decorations when the editor or selection changes
  function updateDecorations() {
      if (!activeEditor) {
          return;
      }

      const selection = activeEditor.selection;
      if (selection.isEmpty) {
          // Clear decorations if no selection
          activeEditor.setDecorations(codeExplainDecorationType, []);
          lastSelectionText = '';
          currentSelectionForExplain = ''; // Also clear the current selection for explain
          decorationRanges.clear();
          return;
      }

      // Always update decorations when selection changes
      const selectionText = activeEditor.document.getText(selection);
      lastSelectionText = selectionText;
      currentSelectionForExplain = selectionText; // Store the current selection for explain
      
      const endPos = selection.end;

      // Define the decoration options - no hover message, just the clickable button
      const decorationOptions = {
          range: new vscode.Range(endPos, endPos),
          renderOptions: {
              after: {
                  contentText: '🔊 CodeXplain',
                  backgroundColor: 'rgba(66, 133, 244, 1.0)',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  margin: '0 0 0 5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  verticalAlign: 'top', // Changed to 'top' to better align with line
                  lineHeight: '1',
                  fontSize: '11px', // Reduced font size
                  height: 'auto',
                  width: 'auto',
                  minHeight: '18px', // Reduced minimum height
                  minWidth: '70px', // Reduced minimum width
                  textAlign: 'center',
                  position: 'relative', // Added position relative
                  top: '0px' // Ensure it's aligned properly
              }
          }
          // Removed hoverMessage property
      };
      
      // Apply the decoration
      activeEditor.setDecorations(codeExplainDecorationType, [decorationOptions]);
      
      // Store the range for click detection
      const buttonRange = new vscode.Range(
          endPos,
          new vscode.Position(endPos.line, Math.min(endPos.character + 20, activeEditor.document.lineAt(endPos.line).range.end.character))
      );
      decorationRanges.set(activeEditor.document.uri.toString(), buttonRange);
  }
  
  // Debounce decoration updates to avoid performance issues
  function triggerUpdateDecorations() {
      if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
      }
      timeout = setTimeout(updateDecorations, 100); // Faster response time
  }
  
  // Initialize if an editor is already open
  if (activeEditor) {
      // Clear any existing decorations first
      activeEditor.setDecorations(codeExplainDecorationType, []);
      // Then update based on current selection
      triggerUpdateDecorations();
  }

  // Update when the editor changes
  vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor;
      if (editor) {
          triggerUpdateDecorations();
      }
  }, null, context.subscriptions);

  // Update when the text or selection changes
  vscode.window.onDidChangeTextEditorSelection(event => {
      if (activeEditor === event.textEditor) {
          triggerUpdateDecorations();
      }
  }, null, context.subscriptions);

  // Register the command to explain code
  let disposable = vscode.commands.registerCommand('codeExplain.explainCode', async () => {
      if (!activeEditor) {
          return;
      }
      
      // Use the stored selection text instead of getting it from the current selection
      if (!currentSelectionForExplain) {
          vscode.window.showInformationMessage('Please select some code to explain');
          return;
      }
      
      const selectionText = currentSelectionForExplain;
      
      // Get server address for the AI voice service
      const localServerAddress = 'http://127.0.0.1:3000/aiVoice';
      
      // Always start the analysis immediately without waiting for webview messages
      try {
          console.log("Starting code analysis automatically");
          vscode.window.showInformationMessage('Analyzing code with IBM Granite...');
          
          // Call IBM Granite model to analyze the code
          const explanationData = await getCodeExplanation(selectionText);
          console.log('Received explanation data, keys:', Object.keys(explanationData || {}).length);
          
          // Now create or update the webview with the data we already have
          if (activeExplainPanel && !activeExplainPanel.dispose) {
              activeExplainPanel.reveal(vscode.ViewColumn.Beside);
              
              // Set the HTML content with the explanation data we already have
              activeExplainPanel.webview.html = getWebviewContent(
                  selectionText,
                  localServerAddress,
                  explanationData
              );
          } else {
              // Create a new panel if none exists
              activeExplainPanel = vscode.window.createWebviewPanel(
                  'codeExplainPanel',
                  'CodeXplain',
                  vscode.ViewColumn.Beside,
                  {
                      enableScripts: true,
                      retainContextWhenHidden: true // Keep the webview content when hidden
                  }
              );
              
              // Handle panel disposal
              activeExplainPanel.onDidDispose(() => {
                  activeExplainPanel = undefined;
              }, null, context.subscriptions);
              
              // Set webview content with the explanation data we already have
              activeExplainPanel.webview.html = getWebviewContent(
                  selectionText,
                  localServerAddress,
                  explanationData
              );
          }
      } catch (error) {
          console.error('Error getting code explanation:', error);
          vscode.window.showErrorMessage(`Error analyzing code: ${error instanceof Error ? error.message : String(error)}`);
          
          // Still show webview but without explanation data
          if (!activeExplainPanel) {
              activeExplainPanel = vscode.window.createWebviewPanel(
                  'codeExplainPanel',
                  'CodeXplain',
                  vscode.ViewColumn.Beside,
                  {
                      enableScripts: true,
                      retainContextWhenHidden: true
                  }
              );
              
              activeExplainPanel.onDidDispose(() => {
                  activeExplainPanel = undefined;
              }, null, context.subscriptions);
          } else {
              activeExplainPanel.reveal(vscode.ViewColumn.Beside);
          }
          
          // Show error in webview
          activeExplainPanel.webview.html = getWebviewContent(
              selectionText,
              localServerAddress
          );
      }
  });

  context.subscriptions.push(disposable);
  
  // Make the decoration clickable by adding a click handler
  context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(event => {
          if (!activeEditor || event.textEditor !== activeEditor) {
              return;
          }
          
          // Check if this was a click (not a regular selection change)
          if (event.selections.length === 1 && event.kind !== undefined) {
              const selection = event.selections[0];
              
              // If the selection is empty (click) and within our decoration range
              if (selection.isEmpty) {
                  const clickPosition = selection.active;
                  const uri = activeEditor.document.uri.toString();
                  const decorationRange = decorationRanges.get(uri);
                  
                  if (decorationRange && decorationRange.contains(clickPosition)) {
                      // This is a click on our decoration - trigger the explain command
                      // The text is already stored in currentSelectionForExplain
                      vscode.commands.executeCommand('codeExplain.explainCode');
                  }
              }
          }
      })
  );
  
  // Keep the text editor command for decoration clicks
  context.subscriptions.push(
      vscode.commands.registerTextEditorCommand(
          'codeExplain.clickDecoration', 
          (textEditor, edit) => {
              vscode.commands.executeCommand('codeExplain.explainCode');
          }
      )
  );
  
  // Add an additional command for handling mouse clicks on the decoration
  context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
          // Force update when document content changes
          if (activeEditor && event.document === activeEditor.document) {
              triggerUpdateDecorations();
          }
      }, null, context.subscriptions)
  );
  
  // Register for mouse click events and selection changes 
  vscode.window.onDidChangeTextEditorSelection((event) => {
      // Force refresh when selection changes
      if (event.textEditor === activeEditor) {
          // Immediate update when selection changes
          updateDecorations();
          
          // Check if all selections are empty and clear decorations if needed
          if (event.selections.every(selection => selection.isEmpty)) {
              // Don't clear currentSelectionForExplain here to allow button clicks to work
              activeEditor.setDecorations(codeExplainDecorationType, []);
              lastSelectionText = '';
              decorationRanges.clear();
          }
      }
  }, null, context.subscriptions);

  // Register a command to manually get explanations that can be called from the webview
  const getExplanationCommand = vscode.commands.registerCommand('codexplain.getExplanation', async () => {
    if (!activeExplainPanel) {
      return;
    }
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    
    // Use currentSelectionForExplain for consistency
    const selectedText = currentSelectionForExplain || editor.document.getText(editor.selection);
    
    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected');
      return;
    }
    
    try {
      console.log("Manual explanation request");
      vscode.window.showInformationMessage('Analyzing code with IBM Granite...');
      
      const explanationData = await getCodeExplanation(selectedText);
      
      if (activeExplainPanel) {
        activeExplainPanel.webview.html = getWebviewContent(
            selectedText,
            'http://127.0.0.1:3000/aiVoice',
            explanationData
        );
      }
    } catch (error) {
      console.error('Error getting explanation:', error);
      vscode.window.showErrorMessage(`Error analyzing code: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(getExplanationCommand);
}

export function deactivate() {}
