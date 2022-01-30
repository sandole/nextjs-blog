import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'
import Image from 'next/image'
import SupportMe from '../public/static/images/support.svg'

export default function Footer() {
  return (
    <footer>
      <div className="flex flex-col items-center mt-16">
        <div className="flex mb-3 space-x-4">
          <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} />
          <SocialIcon kind="github" href={siteMetadata.github} />
          <SocialIcon kind="facebook" href={siteMetadata.facebook} />
        </div>
        <div className="flex mb-2 space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div>{siteMetadata.author}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
        </div>
        <div className="mb-8">
          <Link href="https://www.buymeacoffee.com/sandole97">
            <Image
              alt="Support Me"
              src={SupportMe}
              width={235}
              height={50}
              layout="responsive"
            />
          </Link>
        </div>
      </div>
    </footer>
  )
}
