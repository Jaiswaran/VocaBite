#!/bin/bash
FILES=(
  "src/services/llm/llmService.ts"
  "src/components/ConversationView.tsx"
  "src/components/MenuCatalog.tsx"
  "src/components/OrderCart.tsx"
  "src/components/ConfirmationModal.tsx"
)
for file in "${FILES[@]}"; do
  # Restore template variables
  sed -i 's/₹{/${/g' "$file"
done
