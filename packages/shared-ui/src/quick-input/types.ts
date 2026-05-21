export interface QuickInputItem {
	id: string;
	title: string;
	subtitle?: string;
	icon?: string;
	imageUrl?: string;
	isFavorite?: boolean;
}

export interface QuickAction {
	id: string;
	label: string;
	href?: string;
	icon: string;
	shortcut?: string;
	onclick?: () => void;
}

export interface CreatePreview {
	title: string;
	subtitle: string;
}

export interface HighlightPattern {
	pattern: RegExp;
	className: string;
}
