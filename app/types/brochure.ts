export interface BrochureMeta {
    title: string;
    subtitle: string;
    description: string;
    colors: string[];
    sizes: string[];
}

export interface BrochureSpecs {
    productName: string;
    structure: string;
    hardness: string;
    fabric: string;
    certifications: string[];
}

export interface BrochureImages {
    page1_main: string;
    page1_sub: string;
    page2_layer: string;
    page2_detail: string;
}

export interface BrochurePrompts {
    page1_main: string;
    page1_sub: string;
    page2_layer: string;
    page2_detail: string;
}

export interface BrochureData {
    meta: BrochureMeta;
    specs: BrochureSpecs;
    images: BrochureImages;
    prompts: BrochurePrompts; // 프롬프트 관리용
}
