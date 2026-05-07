import type { EmblaCarouselType } from "embla-carousel";
import {
	type ComponentPropsWithRef,
	useCallback,
	useEffect,
	useState,
} from "react";

type UsePrevNextButtonsType = {
	prevBtnDisabled: boolean;
	nextBtnDisabled: boolean;
	onPrevButtonClick: () => void;
	onNextButtonClick: () => void;
};

export const usePrevNextButtons = (
	emblaApi: EmblaCarouselType | undefined,
): UsePrevNextButtonsType => {
	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

	const onPrevButtonClick = useCallback(() => {
		if (!emblaApi) return;
		const api = emblaApi as unknown as Record<string, unknown>;
		const goToPrev = api.goToPrev;
		const scrollPrev = api.scrollPrev;
		if (typeof goToPrev === "function") (goToPrev as () => void)();
		else if (typeof scrollPrev === "function") (scrollPrev as () => void)();
	}, [emblaApi]);

	const onNextButtonClick = useCallback(() => {
		if (!emblaApi) return;
		const api = emblaApi as unknown as Record<string, unknown>;
		const goToNext = api.goToNext;
		const scrollNext = api.scrollNext;
		if (typeof goToNext === "function") (goToNext as () => void)();
		else if (typeof scrollNext === "function") (scrollNext as () => void)();
	}, [emblaApi]);

	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		const api = emblaApi as unknown as Record<string, unknown>;
		const canGoToPrev = api.canGoToPrev;
		const canGoToNext = api.canGoToNext;
		const canScrollPrev = api.canScrollPrev;
		const canScrollNext = api.canScrollNext;

		if (typeof canGoToPrev === "function")
			setPrevBtnDisabled(!(canGoToPrev as () => boolean)());
		else if (typeof canScrollPrev === "function")
			setPrevBtnDisabled(!(canScrollPrev as () => boolean)());

		if (typeof canGoToNext === "function")
			setNextBtnDisabled(!(canGoToNext as () => boolean)());
		else if (typeof canScrollNext === "function")
			setNextBtnDisabled(!(canScrollNext as () => boolean)());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		onSelect(emblaApi);
		emblaApi.on("reinit", onSelect).on("select", onSelect);
	}, [emblaApi, onSelect]);

	return {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	};
};

type PropType = ComponentPropsWithRef<"button">;

export const PrevButton = (props: PropType) => {
	const { children, disabled, ...restProps } = props;

	return (
		<button
			className={"embla__button embla__button--prev".concat(
				disabled ? " embla__button--disabled" : "",
			)}
			type="button"
			{...restProps}
		>
			<svg className="embla__button__svg" viewBox="0 0 532 532">
				<title>button</title>
				<path
					fill="currentColor"
					d="M355.66 11.354c13.793-13.805 36.208-13.805 50.001 0 13.785 13.804 13.785 36.238 0 50.034L201.22 266l204.442 204.61c13.785 13.805 13.785 36.239 0 50.044-13.793 13.796-36.208 13.796-50.002 0a5994246.277 5994246.277 0 0 0-229.332-229.454 35.065 35.065 0 0 1-10.326-25.126c0-9.2 3.393-18.26 10.326-25.2C172.192 194.973 332.731 34.31 355.66 11.354Z"
				/>
			</svg>
			{children}
		</button>
	);
};

export const NextButton = (props: PropType) => {
	const { children, disabled, ...restProps } = props;

	return (
		<button
			className={"embla__button embla__button--next".concat(
				disabled ? " embla__button--disabled" : "",
			)}
			type="button"
			{...restProps}
		>
			<svg className="embla__button__svg" viewBox="0 0 532 532">
				<title>button</title>
				<path
					fill="currentColor"
					d="M176.34 520.646c-13.793 13.805-36.208 13.805-50.001 0-13.785-13.804-13.785-36.238 0-50.034L330.78 266 126.34 61.391c-13.785-13.805-13.785-36.239 0-50.044 13.793-13.796 36.208-13.796 50.002 0 22.928 22.947 206.395 206.507 229.332 229.454a35.065 35.065 0 0 1 10.326 25.126c0 9.2-3.393 18.26-10.326 25.2-45.865 45.901-206.404 206.564-229.332 229.52Z"
				/>
			</svg>
			{children}
		</button>
	);
};
