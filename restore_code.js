const fs = require('fs');

const oldHtml = fs.readFileSync('really_old_index.html', 'utf8');
const curHtml = fs.readFileSync('index.html', 'utf8');

// The block that was accidentally deleted starts from the FIRST <!-- Tabs --> in really_old_index.html
// and ends right before the SECOND <!-- Tabs --> in really_old_index.html (which is inside showAuthPage)
const startMarker = '      <!-- Tabs -->';
const firstTabsIdx = oldHtml.indexOf(startMarker);
const secondTabsIdx = oldHtml.indexOf(startMarker, firstTabsIdx + 1);

const missingBlock = oldHtml.substring(firstTabsIdx, secondTabsIdx);

// In curHtml, we have:
//       <div class="p-5 border-b border-white/20">
//         <h3 class="text-white font-bold text-lg flex items-center gap-2">...Настройки</h3>
//       </div>
//       <!-- Tabs -->
//       <div class="flex rounded-xl p-1 mb-6 bg-white/5 border border-white/10 text-xs">
//         <button id="authTabPhone"...

// We need to insert `missingBlock` right before the `<!-- Tabs -->` that is currently in curHtml, BUT ONLY if it's the auth tabs!
// Let's find where the `Настройки</h3>\n      </div>` is in curHtml
const insertAfterStr = 'Настройки</h3>\n      </div>\n';
const insertIdx = curHtml.indexOf(insertAfterStr);

if (insertIdx !== -1) {
    const finalInsertIdx = insertIdx + insertAfterStr.length;
    // We replace the current curHtml from finalInsertIdx with missingBlock + the rest of curHtml
    // Wait, in curHtml, right after `Настройки</h3>\n      </div>\n`, there is `      <!-- Tabs -->` which is the NEW auth tabs I injected!
    // Let's just insert missingBlock exactly there!
    let newHtml = curHtml.substring(0, finalInsertIdx) + missingBlock + curHtml.substring(finalInsertIdx);
    fs.writeFileSync('index.html', newHtml, 'utf8');
    console.log("Restored missing functions: showAppSettings (part 2), showNotificationsPanel, showAuthPage (part 1)");
} else {
    console.log("Could not find insertion point!");
}
