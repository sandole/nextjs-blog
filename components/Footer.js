import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'
import Image from 'next/image'
import Link from './Link'

export default function Footer() {
  return (
    <footer>
      <div className="flex flex-col items-center mt-16">
        <div className="flex mb-3">
          <Link href="https://www.buymeacoffee.com/sandole97">
            <Image
              alt="Support Me"
              src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&button_colour=19C0A4&font_colour=000000&font_family=Lato&outline_colour=000000&coffee_colour=000000"
              width={141}
              height={30}
            />
          </Link>
        </div>
        <div className="flex mb-3 space-x-4">
          <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} />
          <SocialIcon kind="github" href={siteMetadata.github} />
          <SocialIcon kind="facebook" href={siteMetadata.facebook} />
        </div>
        <div className="flex mb-2 space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div>{siteMetadata.author}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
        </div>
      </div>
    </footer>
  )
}
