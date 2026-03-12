import csv
from collections import defaultdict

file_path = r'c:\Users\ROG Zephyrus\Downloads\catalog_products_bali.csv'

products = {}
variants = defaultdict(list)
errors = []

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            handle = row.get('handleId', '').strip()
            field_type = row.get('fieldType', '').strip()
            name = row.get('name', '').strip()
            
            if not handle:
                continue
                
            if field_type == 'Product':
                options = {}
                for j in range(1, 7):
                    opt_name = row.get(f'productOptionName{j}', '').strip()
                    opt_desc = row.get(f'productOptionDescription{j}', '').strip()
                    if opt_name:
                        options[f'Option{j}'] = {
                            'name': opt_name,
                            'choices': [c.strip() for c in opt_desc.split(';') if c.strip()]
                        }
                products[handle] = {'row': i, 'options': options}
            elif field_type == 'Variant':
                variant_options = {}
                for j in range(1, 7):
                    opt_desc = row.get(f'productOptionDescription{j}', '').strip()
                    if opt_desc:
                        variant_options[f'Option{j}'] = opt_desc
                variants[handle].append({'row': i, 'options': variant_options})

    for handle, var_list in variants.items():
        if handle not in products:
            errors.append(f'Handle "{handle}" has variants but no Product row.')
            continue
            
        prod_opts = products[handle]['options']
        
        for var in var_list:
            v_opts = var['options']
            # Check if variant describes an option that product doesn't have
            for key, val in v_opts.items():
                if key not in prod_opts:
                    errors.append(f'Row {var["row"]}: Variant has option description "{val}" in {key}, but Product row {products[handle]["row"]} does not define a name for {key}.')
                else:
                    if val not in prod_opts[key]['choices']:
                        errors.append(f'Row {var["row"]}: Variant choice "{val}" is not in Product choices {prod_opts[key]["choices"]} for {prod_opts[key]["name"]}.')

    if not errors:
        print('Structural and Option matching validation passed.')
    else:
        print('Errors found:')
        for e in errors[:50]:
            print(e)
        if len(errors) > 50:
            print(f'...and {len(errors) - 50} more errors.')
except Exception as e:
    print(f'Script error: {e}')
