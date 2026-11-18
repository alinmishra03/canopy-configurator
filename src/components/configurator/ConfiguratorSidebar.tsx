import { useProduct, useSelections } from '@/store/selectors';
import { useConfigurationStore } from '@/store/configurationStore';
import { getSelectedVariant } from '@shared/configuration';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { OptionGroup } from './OptionGroup';
import { ColorOptions } from './ColorOptions';
import { DesignTools } from './DesignTools';

/** Left column: every customization control, driven entirely by the product catalog. */
export function ConfiguratorSidebar() {
  const product = useProduct();
  const selections = useSelections();
  const overrides = useConfigurationStore((s) => Object.keys(s.configuration.colors.panels).length);
  const base = useConfigurationStore((s) => s.configuration.colors.base);
  const paletteName = product.palette.find((p) => p.hex.toLowerCase() === base)?.name ?? base.toUpperCase();

  return (
    <div>
      {product.sections.map((section, i) => (
        <CollapsibleSection
          key={section.id}
          step={i + 1}
          title={section.label}
          summary={getSelectedVariant(product, selections, section.id)?.label}
        >
          <OptionGroup section={section} />
        </CollapsibleSection>
      ))}
      <CollapsibleSection
        step={product.sections.length + 1}
        title="Colors"
        summary={`${paletteName}${overrides ? ` + ${overrides} custom panel${overrides > 1 ? 's' : ''}` : ''}`}
      >
        <ColorOptions />
      </CollapsibleSection>
      <CollapsibleSection step={product.sections.length + 2} title="Logos & Text">
        <DesignTools />
      </CollapsibleSection>
    </div>
  );
}
