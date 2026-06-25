import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {z} from 'zod';

// 产品数据 - 可以轻松编辑
const PRODUCT = {
	name: '智能产品名称',
	tagline: '让生活更简单',
	features: [
		{icon: '⚡', title: '高效', description: '提升10倍工作效率'},
		{icon: '🎯', title: '精准', description: '精准匹配您的需求'},
		{icon: '🔒', title: '安全', description: '企业级安全保障'},
	],
	cta: '立即体验',
};

export const ProductDemo = () => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();

	// 动画时间轴（以帧为单位）
	const timeline = {
		logoIn: 0,
		logoOut: 90,
		feature1In: 120,
		feature2In: 270,
		feature3In: 420,
		ctaIn: 570,
	};

	// Logo 动画
	const logoOpacity = spring({
		frame,
		fps,
		config: {
			damping: 100,
			stiffness: 200,
			mass: 0.5,
		},
	});

	const logoScale = spring({
		frame,
		fps,
		config: {
			damping: 100,
			stiffness: 200,
			mass: 0.5,
		},
	});

	const logoOutOpacity = interpolate(
		frame,
		[timeline.logoOut - 30, timeline.logoOut],
		[1, 0],
		{extrapolateRight: 'clamp'}
	);

	// 特征动画
	const feature1Opacity = interpolate(
		frame,
		[timeline.feature1In - 30, timeline.feature1In],
		[0, 1],
		{extrapolateRight: 'clamp'}
	);

	const feature1X = interpolate(
		frame,
		[timeline.feature1In - 30, timeline.feature1In],
		[-100, 0]
	);

	const feature2Opacity = interpolate(
		frame,
		[timeline.feature2In - 30, timeline.feature2In],
		[0, 1],
		{extrapolateRight: 'clamp'}
	);

	const feature2X = interpolate(
		frame,
		[timeline.feature2In - 30, timeline.feature2In],
		[100, 0]
	);

	const feature3Opacity = interpolate(
		frame,
		[timeline.feature3In - 30, timeline.feature3In],
		[0, 1],
		{extrapolateRight: 'clamp'}
	);

	const feature3Y = interpolate(
		frame,
		[timeline.feature3In - 30, timeline.feature3In],
		[100, 0]
	);

	// CTA 动画
	const ctaOpacity = interpolate(
		frame,
		[timeline.ctaIn - 30, timeline.ctaIn],
		[0, 1],
		{extrapolateRight: 'clamp'}
	);

	const ctaScale = spring({
		frame: frame - timeline.ctaIn,
		fps,
		config: {
			damping: 100,
			stiffness: 200,
			mass: 0.5,
		},
	});

	// 背景渐变
	const bgGradient = interpolate(
		frame,
		[0, durationInFrames],
		[0, 360]
	);

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(${bgGradient}deg, #667eea 0%, #764ba2 100%)`,
				fontFamily: 'Arial, sans-serif',
			}}
		>
			{/* Logo 场景 */}
			<AbsoluteFill
				style={{
					opacity: logoOpacity * logoOutOpacity,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						textAlign: 'center',
						transform: `scale(${logoScale})`,
					}}
				>
					<h1
						style={{
							fontSize: 120,
							fontWeight: 'bold',
							color: '#FFFFFF',
							margin: 0,
							textShadow: '0 4px 20px rgba(0,0,0,0.3)',
						}}
					>
						{PRODUCT.name}
					</h1>
					<p
						style={{
							fontSize: 48,
							color: '#E0E7FF',
							marginTop: 20,
							fontWeight: 300,
						}}
					>
						{PRODUCT.tagline}
					</p>
				</div>
			</AbsoluteFill>

			{/* 特征 1 */}
			<AbsoluteFill
				style={{
					opacity: feature1Opacity,
					justifyContent: 'flex-start',
					alignItems: 'center',
					paddingTop: 200,
				}}
			>
				<div
					style={{
						background: 'rgba(255, 255, 255, 0.95)',
						borderRadius: 30,
						padding: 80,
						textAlign: 'center',
						boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
						maxWidth: 800,
						transform: `translateX(${feature1X}px)`,
					}}
				>
					<div style={{fontSize: 80, marginBottom: 30}}>
						{PRODUCT.features[0].icon}
					</div>
					<h2
						style={{
							fontSize: 64,
							fontWeight: 'bold',
							color: '#1F2937',
							margin: '0 0 20px 0',
						}}
					>
						{PRODUCT.features[0].title}
					</h2>
					<p
						style={{
							fontSize: 36,
							color: '#6B7280',
							margin: 0,
						}}
					>
						{PRODUCT.features[0].description}
					</p>
				</div>
			</AbsoluteFill>

			{/* 特征 2 */}
			<AbsoluteFill
				style={{
					opacity: feature2Opacity,
					justifyContent: 'flex-end',
					alignItems: 'flex-start',
					paddingBottom: 200,
					paddingLeft: 200,
				}}
			>
				<div
					style={{
						background: 'rgba(255, 255, 255, 0.95)',
						borderRadius: 30,
						padding: 80,
						textAlign: 'center',
						boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
						maxWidth: 800,
						transform: `translateX(${feature2X}px)`,
					}}
				>
					<div style={{fontSize: 80, marginBottom: 30}}>
						{PRODUCT.features[1].icon}
					</div>
					<h2
						style={{
							fontSize: 64,
							fontWeight: 'bold',
							color: '#1F2937',
							margin: '0 0 20px 0',
						}}
					>
						{PRODUCT.features[1].title}
					</h2>
					<p
						style={{
							fontSize: 36,
							color: '#6B7280',
							margin: 0,
						}}
					>
						{PRODUCT.features[1].description}
					</p>
				</div>
			</AbsoluteFill>

			{/* 特征 3 */}
			<AbsoluteFill
				style={{
					opacity: feature3Opacity,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						background: 'rgba(255, 255, 255, 0.95)',
						borderRadius: 30,
						padding: 80,
						textAlign: 'center',
						boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
						maxWidth: 800,
						transform: `translateY(${feature3Y}px)`,
					}}
				>
					<div style={{fontSize: 80, marginBottom: 30}}>
						{PRODUCT.features[2].icon}
					</div>
					<h2
						style={{
							fontSize: 64,
							fontWeight: 'bold',
							color: '#1F2937',
							margin: '0 0 20px 0',
						}}
					>
						{PRODUCT.features[2].title}
					</h2>
					<p
						style={{
							fontSize: 36,
							color: '#6B7280',
							margin: 0,
						}}
					>
						{PRODUCT.features[2].description}
					</p>
				</div>
			</AbsoluteFill>

			{/* CTA 按钮 */}
			<AbsoluteFill
				style={{
					opacity: ctaOpacity,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						background: '#FFFFFF',
						borderRadius: 60,
						padding: '60px 120px',
						boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
						transform: `scale(${ctaScale})`,
					}}
				>
					<h2
						style={{
							fontSize: 56,
							fontWeight: 'bold',
							color: '#667eea',
							margin: 0,
						}}
					>
						{PRODUCT.cta}
					</h2>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
