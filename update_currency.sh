#!/bin/bash
FILES=(
  "src/services/llm/llmService.ts"
  "src/components/ConversationView.tsx"
  "src/components/MenuCatalog.tsx"
  "src/components/OrderCart.tsx"
  "src/components/ConfirmationModal.tsx"
)

for file in "${FILES[@]}"; do
  # Replace $ with ₹ for currency display
  sed -i 's/\$${/₹${/g' "$file"
  sed -i 's/>\$/>₹/g' "$file"
  sed -i 's/(\$/(₹/g' "$file"
  sed -i 's/ \$/ ₹/g' "$file"
  
  # Replace toFixed(2) with toFixed(0)
  sed -i 's/toFixed(2)/toFixed(0)/g' "$file"
done
