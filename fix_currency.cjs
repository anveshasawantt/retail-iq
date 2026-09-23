const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'OENT' || err.code === 'EACCES') { }
      else throw err;
    }
  });
  return filelist;
};

const files = walkSync('src').filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

// Create the helper file
const helperContent = `export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
`;
fs.writeFileSync('src/utils/currency.js', helperContent);

files.forEach(file => {
  if (file === path.join('src', 'utils', 'currency.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern for &#8377;${var.toFixed(2)} -> formatINR(var)
  // Pattern for ₹${var.toFixed(2)} -> formatINR(var)
  // Pattern for &#8377;${Number(var).toLocaleString("en-IN")} -> formatINR(var)
  
  // We can just find the files that contain these symbols, add the import, and manually replace with multi_replace_file_content to be safer.
  // Or automate it. Let's automate the obvious ones.
  
  const replacements = [
    { regex: /&#8377;\$\{\((.*?)\)\.toFixed\(\d+\)\}/g, replace: '${formatINR($1)}' },
    { regex: /&#8377;\$\{(.*?)\.toFixed\(\d+\)\}/g, replace: '${formatINR($1)}' },
    { regex: /₹\$\{(.*?)\.toFixed\(\d+\)\}/g, replace: '${formatINR($1)}' },
    { regex: /&#8377;\$\{Number\((.*?)\)\.toLocaleString\("en-IN"\)\}/g, replace: '${formatINR($1)}' },
    { regex: /₹\$\{parseFloat\((.*?)\)\}/g, replace: '${formatINR($1)}' },
    { regex: /₹\{(.*?)\.toFixed\(\d+\)\}/g, replace: '{formatINR($1)}' }
  ];

  let changed = false;
  replacements.forEach(({regex, replace}) => {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  });
  
  // Custom manual replacements for specific cases
  if (content.includes('&#8377;${todayRevenue.toFixed(2)}')) {
    content = content.replace(/&#8377;\$\{todayRevenue\.toFixed\(2\)\}/g, '${formatINR(todayRevenue)}');
    changed = true;
  }
  if (content.includes('&#8377;${avgBasket.toFixed(2)}')) {
    content = content.replace(/&#8377;\$\{avgBasket\.toFixed\(2\)\}/g, '${formatINR(avgBasket)}');
    changed = true;
  }
  
  // Special case: TopProductsChart.jsx and RevenueChart.jsx and CategoryChart.jsx
  if (content.includes('&#8377;{Number(d?.revenue || 0).toLocaleString("en-IN")}')) {
    content = content.replace(/&#8377;\{Number\(d\?\.revenue \|\| 0\)\.toLocaleString\("en-IN"\)\}/g, '{formatINR(d?.revenue)}');
    changed = true;
  }

  // POSPage.jsx
  if (content.includes('₹${denom}')) {
    content = content.replace(/₹\$\{denom\}/g, '${formatINR(denom)}');
    changed = true;
  }
  if (content.includes('₹{(parseFloat(cashTendered) - grandTotal).toFixed(2)}')) {
    content = content.replace(/₹\{\(parseFloat\(cashTendered\) - grandTotal\)\.toFixed\(2\)\}/g, '{formatINR(parseFloat(cashTendered) - grandTotal)}');
    changed = true;
  }
  if (content.includes('Selling: ₹{product.sellingPrice} | Cost: ₹{product.costPrice}')) {
      content = content.replace(/Selling: ₹\{product\.sellingPrice\} \| Cost: ₹\{product\.costPrice\}/g, 'Selling: {formatINR(product.sellingPrice)} | Cost: {formatINR(product.costPrice)}');
      changed = true;
  }

  // If changed, add import if not present
  if (changed && !content.includes('formatINR')) {
      // Find relative path to utils/currency
      const depth = file.split(path.sep).length - 2;
      let relPath = depth === 0 ? './utils/currency' : '../'.repeat(depth) + 'utils/currency';
      const importStatement = `import { formatINR } from "${relPath}";\n`;
      
      // Inject after other imports
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
          const endOfImport = content.indexOf('\n', lastImportIndex);
          content = content.substring(0, endOfImport + 1) + importStatement + content.substring(endOfImport + 1);
      } else {
          content = importStatement + content;
      }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
