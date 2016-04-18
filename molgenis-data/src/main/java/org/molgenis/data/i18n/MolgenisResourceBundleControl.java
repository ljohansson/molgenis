package org.molgenis.data.i18n;

import static org.molgenis.security.core.runas.RunAsSystemProxy.runAsSystem;

import java.io.IOException;
import java.util.List;
import java.util.ListResourceBundle;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.stream.Collectors;

import org.molgenis.data.DataService;
import org.molgenis.data.Entity;
import org.molgenis.data.settings.AppSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ResourceBundle Control that gets it content from the i18nstrings repository
 */
public class MolgenisResourceBundleControl extends ResourceBundle.Control
{
	private static final Logger LOG = LoggerFactory.getLogger(MolgenisResourceBundleControl.class);
	private final DataService dataService;
	private final AppSettings appSettings;

	public MolgenisResourceBundleControl(DataService dataService, AppSettings appSettings)
	{
		this.dataService = dataService;
		this.appSettings = appSettings;
	}

	@Override
	public ResourceBundle newBundle(String baseName, Locale locale, String format, ClassLoader loader, boolean reload)
			throws IllegalAccessException, InstantiationException, IOException
	{
		String languageCode = locale.getLanguage();

		// Only handle i18nstrings bundle
		if (!baseName.equals(I18nStringMetaData.ENTITY_NAME)) return null;

		// Only handle languages that are present in the languages repository
		if (runAsSystem(() -> dataService.query(LanguageMetaData.ENTITY_NAME).eq(LanguageMetaData.CODE, languageCode)
				.count()) == 0) return null;

		return new MolgenisResourceBundle(dataService, languageCode, appSettings);
	}

	protected static class MolgenisResourceBundle extends ListResourceBundle
	{
		private final DataService dataService;
		private final String languageCode;
		private final AppSettings appSettings;
		private String appLanguageCode;

		public MolgenisResourceBundle(DataService dataService, String languageCode, AppSettings appSettings)
		{
			this.dataService = dataService;
			this.languageCode = languageCode;
			this.appSettings = appSettings;
		}

		@Override
		protected Object[][] getContents()
		{
			List<Entity> entities = runAsSystem(() -> dataService.findAll(I18nStringMetaData.ENTITY_NAME).collect(
					Collectors.toList()));

			appLanguageCode = appSettings.getLanguageCode();

			boolean exists = (appLanguageCode != null) && runAsSystem(() -> {
				return (dataService.findOneById(LanguageMetaData.ENTITY_NAME, appLanguageCode) != null);
			});

			if (!exists) appLanguageCode = null;

			Object[][] contents = new Object[entities.size()][2];
			int i = 0;
			for (Entity entity : entities)
			{
				String msgid = entity.getString(I18nStringMetaData.MSGID);
				String msg = entity.getString(languageCode);
				if (msg == null)
				{
					// Missing translation for this language, return in app language
					LOG.warn("Missing '{}' msg for language '{}'", msgid, languageCode);

					if (appLanguageCode != null)
					{
						msg = entity.getString(appLanguageCode);
					}

					// Also missing in app language, use default
					if (msg == null)
					{
						msg = entity.getString(LanguageService.FALLBACK_LANGUAGE);
					}

					if (msg == null)
					{
						msg = "#" + msgid + "#";
					}
				}

				contents[i++] = new Object[]
				{ msgid, msg };
			}

			return contents;
		}
	}

}
