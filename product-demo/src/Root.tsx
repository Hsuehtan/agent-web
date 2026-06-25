import {Composition} from 'remotion';
import {ProductDemo} from './ProductDemo';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="product-demo"
				component={ProductDemo}
				durationInFrames={900} // 30 seconds at 30fps
				fps={30}
				width={1920}
				height={1080}
				props={{}}
			/>
		</>
	);
};
