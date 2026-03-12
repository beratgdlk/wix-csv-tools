const inquirer = require('inquirer');

const modules = {
    Analyzers: [
        require('./analyzers/images'),
        require('./analyzers/compare')
    ],
    Validators: [
        require('./validators/comprehensive')
    ],
    Fixers: [
        require('./fixers/general'),
        require('./fixers/missing-images')
    ]
};

async function main() {
    console.log("=========================================");
    console.log("   Wix CSV Tools CLI Generator");
    console.log("=========================================\n");

    const { category } = await inquirer.prompt([
        {
            type: 'list',
            name: 'category',
            message: 'Select a tool category:',
            choices: Object.keys(modules)
        }
    ]);

    const tools = modules[category];
    
    const { toolIndex } = await inquirer.prompt([
        {
            type: 'list',
            name: 'toolIndex',
            message: `Select a ${category.slice(0, -1)} tool to run:`,
            choices: tools.map((t, i) => ({ name: `${t.name} - ${t.description}`, value: i }))
        }
    ]);

    const selectedTool = tools[toolIndex];
    console.log(`\n============================`);
    console.log(` Starting: ${selectedTool.name}`);
    console.log(`============================\n`);
    
    try {
        await selectedTool.run(inquirer);
    } catch (e) {
        console.error("Tool execution failed:", e);
    }
}

// Trap Ctrl+C appropriately
process.on('SIGINT', function() {
    process.exit();
});

main();
